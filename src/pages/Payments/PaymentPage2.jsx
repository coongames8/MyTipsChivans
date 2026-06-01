import { useState, useContext, useRef, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Check, CopyAll } from "@mui/icons-material";
import AppHelmet from "../../components/AppHelmet";
import NowPaymentsApi from "@nowpaymentsio/nowpayments-api-js";
import { doc, setDoc } from "firebase/firestore";
import { db, getUser } from "../../firebase";
import "./Payments.scss";
import { AuthContext } from "../../AuthContext";
import { PriceContext } from "../../PriceContext";
import Swal from "sweetalert2";

const npApi = new NowPaymentsApi({ apiKey: "D7YT1YV-PCAM4ZN-HX9W5M1-H02KFCV" });

// PayPal configuration
const paypalInitialOptions = {
  "client-id": "AXIggvGGvXozbZhdkvizPLd89nVYW8KoyNlHO0gHx7hjY_Ah_IfgXihUQGf7T2HUUVYx-D5SNncM0CtU",
  currency: "USD",
  intent: "capture",
};

// HashBack API Configuration
const HASHBACK_API_URL = 'https://hash-back-server-production.up.railway.app';

// Direct HashPay API Configuration (for direct status checks when backend fails)
const HASHPAY_API_KEY = "h265272vstks7";
const HASHPAY_ACCOUNT_ID = "HP785409";
const HASHPAY_STATUS_URL = "https://api.hashback.co.ke/transactionstatus";

// Fixed exchange rate (approximate KSH to USD)
const EXCHANGE_RATE = 150;

export default function PaymentPage2({ setUserData }) {
  const { price, setPrice } = useContext(PriceContext);
  const { currentUser } = useContext(AuthContext);
  const [paymentType, setPaymentType] = useState("mpesa");
  const [currenciesArr, setCurrenciesArr] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState("TUSD");
  const addressRef = useRef();
  const [copied, setCopied] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("");
  const [paypalKey, setPaypalKey] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef(null);
  const currentCheckoutIdRef = useRef(null);
  const currentReferenceRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);
  const paymentCompletedRef = useRef(false);
  const timeoutRef = useRef(null);

  const paymentMethods = [
    { id: "mpesa", label: "M-Pesa 📱" },
    { id: "crypto", label: "Crypto ₿" },
  ];

  const subscriptionPlans = {
    mpesa: [
      { id: "daily", value: 200, label: "Daily VIP", price: "KSH 200" },
      { id: "weekly", value: 700, label: "7 Days VIP", price: "KSH 700" },
      { id: "monthly", value: 10, label: "30 Days VIP", price: "KSH 2000" },
      { id: "yearly", value: 7500, label: "1 Year VIP", price: "KSH 7500" },
    ],
    crypto: [
      { id: "10", value: 1500, label: "Weekly", price: "$10" },
      { id: "15", value: 2400, label: "Monthly", price: "$16" },
      { id: "50", value: 7500, label: "Yearly", price: "$50" },
    ],
    paypal: [
      { id: "2", value: 300, label: "Daily", price: "$2" },
      { id: "10", value: 1500, label: "Weekly", price: "$10" },
      { id: "15", value: 2400, label: "Monthly", price: "$16" },
      { id: "50", value: 7500, label: "Yearly", price: "$50" },
    ],
  };

  useEffect(() => {
    setupWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const setupWebSocket = () => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      
      wsRef.current = new WebSocket('wss://hash-back-server-production.up.railway.app');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        if (currentCheckoutIdRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'register',
            checkoutId: currentCheckoutIdRef.current
          }));
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message:', message);
          
          if (message.type === 'payment_completed') {
            console.log('✅ Payment completed via WebSocket!');
            handlePaymentSuccess(message.data);
          }
        } catch (error) {
          console.error('WebSocket parse error:', error);
        }
      };
      
      wsRef.current.onerror = (error) => console.error('WebSocket error:', error);
      wsRef.current.onclose = () => setTimeout(setupWebSocket, 5000);
    } catch (error) {
      console.log('WebSocket failed:', error);
    }
  };

  // Direct HashPay status check
  const checkHashPayStatusDirectly = async (checkoutId) => {
    try {
      console.log('🔍 Direct HashPay status check for:', checkoutId);
      
      const response = await fetch(HASHPAY_STATUS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: HASHPAY_API_KEY,
          account_id: HASHPAY_ACCOUNT_ID,
          checkoutid: checkoutId,
        }),
      });

      const data = await response.json();
      console.log('Direct HashPay response:', data);

      if (data.ResultCode === "0" || data.ResultCode === 0) {
        return {
          status: 'completed',
          transactionId: data.TransactionID,
          amount: data.TransactionAmount,
        };
      } else if (data.ResultCode === "2" || data.ResultCode === 2) {
        return { status: 'failed', errorDesc: data.ResultDesc };
      }
      return { status: 'pending' };
    } catch (error) {
      console.error('Direct HashPay error:', error);
      return { status: 'unknown' };
    }
  };

  const kshToUsd = (ksh) => (ksh / EXCHANGE_RATE).toFixed(2);
  const getCurrentPriceInUsd = () => kshToUsd(price);

  const formatPhoneNumberForHashBack = (phone) => {
    let p = phone.toString().replace(/\D/g, "");
    if (p.startsWith("0")) return p;
    if (p.startsWith("7") || p.startsWith("1")) return "0" + p;
    if (p.startsWith("254")) return "0" + p.substring(3);
    return p;
  };

  const formatPhoneForDisplay = (phone) => {
    let p = phone.toString().replace(/\D/g, "");
    if (p.startsWith("254")) return "0" + p.substring(3);
    if (p.startsWith("0")) return p;
    if (p.startsWith("7")) return "0" + p;
    return p;
  };

  const isValidPhoneNumber = (phone) => {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("07") && digits.length === 10;
  };

  useEffect(() => {
    const defaultPlan = subscriptionPlans[paymentType][0];
    setPrice(defaultPlan.value);
  }, [paymentType]);

  const getSubscriptionPeriod = () => {
    if (price === 200 || price === 300) return "Daily";
    if (price === 700 || price === 1500) return "Weekly";
    if (price === 2000 || price === 2400) return "Monthly";
    return "Yearly";
  };

  const handleUpgrade = async () => {
    try {
      const userDocRef = doc(db, "users", currentUser.email);
      await setDoc(
        userDocRef,
        {
          email: currentUser.email,
          username: currentUser.email,
          isPremium: true,
          subscription: getSubscriptionPeriod(),
          subDate: new Date().toISOString(),
        },
        { merge: true }
      );
      await getUser(currentUser.email, setUserData);
      Swal.fire({
        title: "Success! 🎉",
        text: `You have upgraded to ${getSubscriptionPeriod()} VIP`,
        icon: "success",
        confirmButtonText: "Continue"
      }).then(() => {
        window.location.pathname = "/";
      });
    } catch (error) {
      Swal.fire({ title: "Error", text: error.message, icon: "error" });
    }
  };

  const handlePaymentSuccess = (data) => {
    if (paymentCompletedRef.current) {
      console.log('Payment already processed, skipping duplicate');
      return;
    }
    
    console.log('🎉 Payment success:', data);
    paymentCompletedRef.current = true;
    
    if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    Swal.close();
    setIsProcessing(false);
    
    // Show success message
    Swal.fire({
      title: "Payment Successful! 🎉",
      html: `
        <div style="text-align: center;">
          <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981;"></i>
          <h3 style="margin: 15px 0;">KSh ${data.amount || price} Paid</h3>
          <p>Your VIP subscription payment was successful!</p>
          <div style="background: #f8f9ff; padding: 12px; border-radius: 8px; margin-top: 15px; text-align: left;">
            <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${data.transactionId || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Reference:</strong> ${data.reference || currentReferenceRef.current || 'N/A'}</p>
          </div>
        </div>
      `,
      icon: "success",
      confirmButtonText: "Activate Subscription",
      confirmButtonColor: "#059669",
      allowOutsideClick: false
    }).then(() => {
      handleUpgrade();
    });
  };

  const checkPaymentStatus = async (checkoutId, showLoading = false) => {
    try {
      if (showLoading) {
        Swal.fire({
          title: "Checking Payment Status",
          text: "Please wait...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });
      }
      
      console.log('Checking status for:', checkoutId);
      
      // Try backend first
      let data = null;
      try {
        const response = await fetch(`${HASHBACK_API_URL}/api/check-payment-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutId })
        });
        data = await response.json();
        console.log('Backend status:', data);
      } catch (err) {
        console.log('Backend check failed');
      }
      
      // If backend doesn't show completed, try direct HashPay
      if (!data || data.status !== 'completed') {
        const directResult = await checkHashPayStatusDirectly(checkoutId);
        if (directResult.status === 'completed') {
          data = directResult;
        }
      }
      
      if (showLoading) Swal.close();
      
      if (data?.status === 'completed') {
        handlePaymentSuccess(data);
        return true;
      } else if (data?.status === 'failed') {
        Swal.fire({ title: "Payment Failed", text: "Please try again.", icon: "error" });
        setIsProcessing(false);
        paymentCompletedRef.current = false;
        return false;
      }
      return false;
    } catch (error) {
      console.error('Status check error:', error);
      if (showLoading) Swal.close();
      return false;
    }
  };

  const handleMpesaPayment = async () => {
    if (isProcessing) return;
    paymentCompletedRef.current = false;
    
    const { value: phoneNumber } = await Swal.fire({
      title: "Enter M-Pesa Phone Number",
      html: `<div style="text-align:center;"><i class="fas fa-mobile-alt" style="font-size:48px;color:#065f46;"></i>
        <p style="margin:15px 0;">Enter M-Pesa number to receive payment prompt.</p>
        <p style="font-size:0.8rem;color:#666;">Format: 07XXXXXXXX (10 digits)</p></div>`,
      input: "tel",
      inputPlaceholder: "e.g., 0712345678",
      showCancelButton: true,
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#059669",
      inputValidator: (value) => {
        if (!value) return "Phone number is required!";
        if (!isValidPhoneNumber(value)) return "Enter valid Kenyan number (e.g., 0712345678)";
        return null;
      }
    });

    if (!phoneNumber) return;

    const formattedPhone = formatPhoneNumberForHashBack(phoneNumber);
    const displayPhone = formatPhoneForDisplay(phoneNumber);
    
    Swal.fire({ title: "Initiating Payment", text: "Connecting to M-Pesa...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    setIsProcessing(true);

    try {
      const reference = `VIP-${getSubscriptionPeriod()}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      currentReferenceRef.current = reference;
      
      const response = await fetch(`${HASHBACK_API_URL}/api/initiate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          phone: formattedPhone,
          reference: reference,
          userId: currentUser?.email || 'anonymous',
          metadata: { type: 'vip_subscription', period: getSubscriptionPeriod() }
        })
      });

      const data = await response.json();
      console.log('Initiation response:', data);
      
      if (data.success && data.checkoutId) {
        currentCheckoutIdRef.current = data.checkoutId;
        
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'register', checkoutId: data.checkoutId }));
        }
        
        Swal.close();
        
        // Show waiting modal with manual check option
        Swal.fire({
          title: "Check Your Phone",
          html: `
            <div style="text-align: center;">
              <i class="fas fa-mobile-alt" style="font-size: 48px; color: #065f46;"></i>
              <h3 style="margin: 15px 0;">Enter M-Pesa PIN</h3>
              <p>Check your phone and enter PIN to pay <strong>KSH ${price}</strong></p>
              <p style="margin-top: 10px;"><small>Phone: ${displayPhone}</small></p>
              <div style="background: #f8f9ff; padding: 12px; border-radius: 8px; margin: 15px 0;">
                <p style="font-size: 0.8rem; margin: 0;">Reference: ${reference}</p>
              </div>
              <div class="spinner-border" style="width:40px;height:40px;margin:20px auto;"></div>
              <p style="color: #059669;"><i class="fas fa-clock"></i> Waiting for confirmation...</p>
              <button id="manualCheckBtn" class="swal2-confirm swal2-styled" style="margin-top:15px;background:#059669;">
                <i class="fas fa-sync-alt"></i> Check Status Now
              </button>
            </div>
          `,
          icon: "info",
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: "Cancel",
          didOpen: () => {
            const checkBtn = document.getElementById('manualCheckBtn');
            if (checkBtn) {
              checkBtn.onclick = async () => {
                checkBtn.disabled = true;
                checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
                const completed = await checkPaymentStatus(currentCheckoutIdRef.current, true);
                if (completed) {
                  Swal.close();
                } else {
                  checkBtn.disabled = false;
                  checkBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Check Status Now';
                  Swal.fire({ title: "Not Confirmed", text: "Payment not confirmed yet. Complete the transaction on your phone.", icon: "info", confirmButtonText: "OK" });
                }
              };
            }
            
            // Poll every 5 seconds
            statusCheckIntervalRef.current = setInterval(async () => {
              if (currentCheckoutIdRef.current && !paymentCompletedRef.current) {
                const completed = await checkPaymentStatus(currentCheckoutIdRef.current);
                if (completed) Swal.close();
              }
            }, 5000);
            
            // 3 minute timeout
            timeoutRef.current = setTimeout(() => {
              if (!paymentCompletedRef.current) {
                clearInterval(statusCheckIntervalRef.current);
                Swal.fire({
                  title: "Still Waiting?",
                  html: `
                    <div style="text-align:center;">
                      <i class="fas fa-question-circle" style="font-size:48px;color:#f59e0b;"></i>
                      <h3>Payment Status Unknown</h3>
                      <p>If you completed the payment, click verify below.</p>
                      <div style="background:#fef3c7;padding:12px;border-radius:8px;margin:15px 0;">
                        <p><strong>Reference: ${reference}</strong></p>
                      </div>
                      <button id="verifyFinalBtn" class="swal2-confirm swal2-styled" style="background:#059669;">
                        <i class="fas fa-check-circle"></i> Verify Payment
                      </button>
                    </div>
                  `,
                  icon: "warning",
                  showConfirmButton: false,
                  showCancelButton: true,
                  cancelButtonText: "Close",
                  didOpen: () => {
                    const verifyBtn = document.getElementById('verifyFinalBtn');
                    if (verifyBtn) {
                      verifyBtn.onclick = async () => {
                        verifyBtn.disabled = true;
                        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
                        const completed = await checkPaymentStatus(currentCheckoutIdRef.current, true);
                        if (!completed) {
                          Swal.fire({
                            title: "Not Verified",
                            html: `Please save reference: <strong>${reference}</strong> and contact support.`,
                            icon: "info",
                            confirmButtonText: "OK"
                          });
                          setIsProcessing(false);
                        }
                      };
                    }
                  }
                });
                setIsProcessing(false);
              }
            }, 180000);
          }
        });
      } else {
        throw new Error(data.error || "Initiation failed");
      }
    } catch (error) {
      console.error('Payment error:', error);
      Swal.fire({ title: "Payment Failed", text: error.message, icon: "error" });
      setIsProcessing(false);
      paymentCompletedRef.current = false;
    }
  };

  const getCryptoAddress = async () => {
    const usdPrice = getCurrentPriceInUsd();
    const response = await npApi.createPayment({
      price_amount: parseFloat(usdPrice),
      price_currency: "usd",
      pay_currency: selectedCurrency.toLowerCase(),
    });
    setPayAmount(response.pay_amount);
    setPayCurrency(response.pay_currency);
    setAddress(response.pay_address);
    setNetwork(response.network);
  };

  const handleCopy = (e) => {
    e.preventDefault();
    addressRef.current.select();
    document.execCommand("copy");
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  useEffect(() => {
    const fetchCurrencies = async () => {
      const response = await fetch("https://api.nowpayments.io/v1/merchant/coins", {
        headers: { "x-api-key": "K80YG02-W464QP0-QR7E9EZ-QFY3ZGQ" },
      });
      const data = await response.json();
      setCurrenciesArr(data.selectedCurrencies);
    };
    fetchCurrencies();
    if (paymentType === "crypto") getCryptoAddress();
  }, [selectedCurrency, price, paymentType]);

  useEffect(() => {
    if (paymentType === "paypal") setPaypalKey(prev => prev + 1);
  }, [price, paymentType]);

  const handlePaymentMethodChange = (methodId) => {
    setPaymentType(methodId);
    setIsProcessing(false);
    paymentCompletedRef.current = false;
  };

  const createPayPalOrder = (data, actions) => {
    const usdPrice = getCurrentPriceInUsd();
    return actions.order.create({
      purchase_units: [{ amount: { value: usdPrice, currency_code: "USD" }, description: `${getSubscriptionPeriod()} VIP Subscription` }],
    });
  };

  const onPayPalApprove = (data, actions) => {
    return actions.order.capture().then(() => handleUpgrade());
  };

  const onPayPalError = (err) => {
    console.error("PayPal error:", err);
    Swal.fire({ title: "Payment Failed", text: "Please try again.", icon: "error" });
  };

  const getDisplayPrice = () => paymentType === "mpesa" ? `KSH ${price}` : `$${getCurrentPriceInUsd()}`;

  return (
    <PayPalScriptProvider options={paypalInitialOptions}>
      <div className="payment-container">
        <AppHelmet title="Payment" location="/pay" />
        <div className="payment-glass">
          <h2 className="payment-title">Select Payment Method</h2>

          <div className="method-selector">
            {paymentMethods.map((method) => (
              <label key={method.id} className={`method-option ${paymentType === method.id ? "active" : ""}`}>
                <input type="radio" name="payment-method" value={method.id} checked={paymentType === method.id} onChange={() => handlePaymentMethodChange(method.id)} />
                {method.label}
              </label>
            ))}
          </div>

          <div className="plan-selector">
            {subscriptionPlans[paymentType].map((plan) => (
              <label key={plan.id} className={`plan-option ${price === plan.value ? "active" : ""}`}>
                <input type="radio" name="subscription-plan" value={plan.value} checked={price === plan.value} onChange={() => setPrice(plan.value)} />
                <span className="plan-label">{plan.label}</span>
                <span className="plan-price">{plan.price}</span>
              </label>
            ))}
          </div>

          {paymentType === "crypto" ? (
            <div className="crypto-details">
              <h3>CRYPTO PAYMENT DETAILS</h3>
              <div className="form-group">
                <label>Select Currency:</label>
                <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} className="glass-select">
                  {currenciesArr?.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </div>
              <div className="payment-info">
                <p>Amount: <span>{payAmount} {payCurrency?.toUpperCase()}</span></p>
                <p>Network: <span>{network?.toUpperCase()}</span></p>
                <p>Address: <span>{address}</span></p>
              </div>
              <div className="address-copy">
                <input type="text" value={address || ""} readOnly ref={addressRef} className="glass-input" />
                <button onClick={handleCopy} className="copy-btn">{copied ? <Check className="icon" /> : <CopyAll className="icon" />}</button>
              </div>
            </div>
          ) : paymentType === "mpesa" ? (
            <div className="mpesa-payment">
              <h3>GET {getSubscriptionPeriod().toUpperCase()} VIP FOR {getDisplayPrice()}</h3>
              <button onClick={handleMpesaPayment} className="paystack-btn" disabled={isProcessing} style={{ background: isProcessing ? '#9ca3af' : 'linear-gradient(135deg, #059669 0%, #047857 100%)', cursor: isProcessing ? "not-allowed" : "pointer" }}>
                <i className={`fas ${isProcessing ? 'fa-spinner fa-spin' : 'fa-mobile-alt'}`} style={{ marginRight: '8px' }}></i>
                {isProcessing ? "Processing..." : "Pay with M-Pesa"}
              </button>
            </div>
          ) : (
            <div className="paypal-payment">
              <h3>GET {getSubscriptionPeriod().toUpperCase()} VIP FOR {getDisplayPrice()}</h3>
              <div className="paypal-buttons-container">
                <PayPalButtons key={paypalKey} style={{ layout: "horizontal", color: "gold", shape: "pill", label: "pay" }} createOrder={createPayPalOrder} onApprove={onPayPalApprove} onError={onPayPalError} forceReRender={[price]} />
              </div>
              <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>Paying: {getDisplayPrice()} for {getSubscriptionPeriod()} VIP</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .spinner-border {
          display: inline-block;
          width: 40px;
          height: 40px;
          border: 4px solid #059669;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spinner-border 0.75s linear infinite;
        }
        @keyframes spinner-border {
          to { transform: rotate(360deg); }
        }
        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </PayPalScriptProvider>
  );
}