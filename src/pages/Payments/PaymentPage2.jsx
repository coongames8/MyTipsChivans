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

// Fixed exchange rate (approximate KSH to USD)
const EXCHANGE_RATE = 150; // 1 USD = 150 KSH

export default function PaymentPage2({ setUserData }) {
  const { price, setPrice } = useContext(PriceContext); // price is always in KSH
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

  // Payment methods
  const paymentMethods = [
    { id: "mpesa", label: "M-Pesa 📱" },
    { id: "crypto", label: "Crypto ₿" },
    /*{ id: "paypal", label: "PayPal 💳" },*/
  ];

  // All prices stored in KSH for PriceContext
  const subscriptionPlans = {
    mpesa: [
      { id: "daily", value: 1, label: "Daily VIP", price: "KSH 1" },
      { id: "weekly", value: 700, label: "7 Days VIP", price: "KSH 700" },
      { id: "monthly", value: 10, label: "30 Days VIP", price: "KSH 10" },
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

  // WebSocket setup for real-time payment confirmation
  useEffect(() => {
    setupWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const setupWebSocket = () => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      
      wsRef.current = new WebSocket('wss://hash-back-server-production.up.railway.app');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected for payment');
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
          console.log('WebSocket message received:', message);
          
          if (message.type === 'payment_completed') {
            console.log('✅ Payment completed via WebSocket!');
            handlePaymentSuccess(message.data);
          } else if (message.type === 'registered') {
            console.log('✅ Registered for checkout:', message.checkoutId);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setTimeout(setupWebSocket, 5000);
      };
    } catch (error) {
      console.log('WebSocket not supported, using polling fallback');
    }
  };

  // Currency conversion helpers
  const kshToUsd = (ksh) => (ksh / EXCHANGE_RATE).toFixed(2);
  const usdToKsh = (usd) => Math.round(usd * EXCHANGE_RATE);

  // Get current price in USD for PayPal/Crypto
  const getCurrentPriceInUsd = () => {
    return kshToUsd(price);
  };

  // Format phone number for HashBack
  const formatPhoneNumberForHashBack = (phone) => {
    let p = phone.toString().replace(/\D/g, "");
    
    if (p.startsWith("0")) {
      return p;
    }
    if (p.startsWith("7") || p.startsWith("1")) {
      return "0" + p;
    }
    if (p.startsWith("254")) {
      return "0" + p.substring(3);
    }
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

  // Initialize price based on payment type
  useEffect(() => {
    const defaultPlan = subscriptionPlans[paymentType][0];
    setPrice(defaultPlan.value);
  }, [paymentType]);

  const getSubscriptionPeriod = () => {
    if (price === 1 || price === 300) return "Daily";
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
      Swal.fire({
        title: "Error",
        text: error.message,
        icon: "error"
      });
    }
  };

  const handlePaymentSuccess = (data) => {
    // Prevent duplicate success messages
    if (paymentCompletedRef.current) {
      console.log('Payment already processed, skipping duplicate');
      return;
    }
    
    console.log('🎉 Processing payment success:', data);
    paymentCompletedRef.current = true;
    
    // Clear all intervals and timeouts
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    Swal.close();
    setIsProcessing(false);
    
    Swal.fire({
      title: "Payment Successful! 🎉",
      html: `
        <div style="text-align: center;">
          <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981;"></i>
          <h3 style="margin: 15px 0;">KSh ${data.amount || price} Paid</h3>
          <p>Your VIP subscription payment was successful!</p>
          <div style="background: #f8f9ff; padding: 12px; border-radius: 8px; margin-top: 15px; text-align: left;">
            <p style="margin: 5px 0; font-size: 0.85rem;">
              <strong>Transaction ID:</strong> ${data.transactionId || data.TransactionID || 'N/A'}
            </p>
            <p style="margin: 5px 0; font-size: 0.85rem;">
              <strong>Reference:</strong> ${data.reference || currentReferenceRef.current || 'N/A'}
            </p>
            <p style="margin: 5px 0; font-size: 0.85rem;">
              <strong>Checkout ID:</strong> ${data.checkoutId || currentCheckoutIdRef.current || 'N/A'}
            </p>
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
          didOpen: () => {
            Swal.showLoading();
          }
        });
      }
      
      console.log('Checking payment status for checkoutId:', checkoutId);
      const response = await fetch(`${HASHBACK_API_URL}/api/check-payment-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutId })
      });
      
      const data = await response.json();
      console.log('Full payment status response:', data);
      
      if (showLoading) {
        Swal.close();
      }
      
      if (data.status === 'completed') {
        console.log('✅ Payment completed detected via polling!');
        if (statusCheckIntervalRef.current) {
          clearInterval(statusCheckIntervalRef.current);
          statusCheckIntervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        handlePaymentSuccess(data);
        return true;
      } else if (data.status === 'failed') {
        console.log('❌ Payment failed:', data);
        if (statusCheckIntervalRef.current) {
          clearInterval(statusCheckIntervalRef.current);
          statusCheckIntervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        Swal.fire({
          title: "Payment Failed",
          text: data.errorDesc || "The payment was not successful. Please try again.",
          icon: "error"
        });
        setIsProcessing(false);
        paymentCompletedRef.current = false;
        return false;
      } else {
        console.log('⏳ Payment status:', data.status, '- still waiting...');
        console.log('Full data for debugging:', JSON.stringify(data, null, 2));
        return false;
      }
    } catch (error) {
      console.error('Status check error:', error);
      if (showLoading) {
        Swal.close();
      }
      return false;
    }
  };

  // Handle M-Pesa payment with HashBack
  const handleMpesaPayment = async () => {
    if (isProcessing) return;
    
    // Reset payment completed flag
    paymentCompletedRef.current = false;
    
    // Show phone number input modal
    const { value: phoneNumber } = await Swal.fire({
      title: "Enter M-Pesa Phone Number",
      html: `
        <div style="text-align: center; margin-bottom: 15px;">
          <i class="fas fa-mobile-alt" style="font-size: 48px; color: #065f46;"></i>
        </div>
        <p style="margin-bottom: 15px;">Enter the M-Pesa phone number to receive the payment prompt.</p>
        <p style="font-size: 0.8rem; color: #666;">Format: 07XXXXXXXX (10 digits)</p>
      `,
      input: "tel",
      inputPlaceholder: "e.g., 0712345678",
      showCancelButton: true,
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#059669",
      cancelButtonColor: "#6c757d",
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value) {
          return "Phone number is required!";
        }
        if (!isValidPhoneNumber(value)) {
          return "Please enter a valid Kenyan phone number (e.g., 0712345678)";
        }
        return null;
      }
    });

    if (!phoneNumber) return;

    const formattedPhone = formatPhoneNumberForHashBack(phoneNumber);
    const displayPhone = formatPhoneForDisplay(phoneNumber);
    
    // Show loading
    Swal.fire({
      title: "Initiating Payment",
      text: "Connecting to M-Pesa...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    setIsProcessing(true);

    try {
      const reference = `VIP-${getSubscriptionPeriod()}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      currentReferenceRef.current = reference;
      
      console.log('Initiating payment with:', {
        amount: price,
        phone: formattedPhone,
        reference: reference
      });
      
      const response = await fetch(`${HASHBACK_API_URL}/api/initiate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          phone: formattedPhone,
          reference: reference,
          userId: currentUser?.email || 'anonymous',
          metadata: {
            type: 'vip_subscription',
            period: getSubscriptionPeriod(),
            payment_method: 'mpesa'
          }
        })
      });

      const data = await response.json();
      console.log('Initiation response:', data);
      
      if (data.success && data.checkoutId) {
        currentCheckoutIdRef.current = data.checkoutId;
        
        // Register with WebSocket if available
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'register',
            checkoutId: data.checkoutId
          }));
          console.log('Registered checkout with WebSocket:', data.checkoutId);
        } else {
          console.log('WebSocket not ready, will rely on polling');
        }
        
        Swal.close();
        
        // Show M-Pesa prompt with waiting indicator
        Swal.fire({
          title: "Check Your Phone",
          html: `
            <div style="text-align: center;">
              <i class="fas fa-mobile-alt" style="font-size: 48px; color: #065f46;"></i>
              <h3 style="margin: 15px 0;">Enter M-Pesa PIN</h3>
              <p>Check your phone to authorize payment of <strong>KSH ${price}</strong></p>
              <p style="margin-top: 10px;"><small>Phone: ${displayPhone}</small></p>
              <div style="background: #f8f9ff; padding: 12px; border-radius: 8px; margin-top: 15px;">
                <p style="font-size: 0.8rem; margin: 0; color: #666;">
                  Reference: ${reference}
                </p>
                <p style="font-size: 0.8rem; margin: 5px 0 0 0; color: #666;">
                  Checkout ID: ${data.checkoutId}
                </p>
              </div>
              <div style="margin-top: 20px;">
                <div class="spinner-border text-success" role="status" style="width: 40px; height: 40px;">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
              <p style="font-size: 0.85rem; color: #059669; margin-top: 15px;">
                <i class="fas fa-clock"></i> Waiting for payment confirmation...
              </p>
              <p style="font-size: 0.75rem; color: #888; margin-top: 10px;">
                If you completed the payment and don't see confirmation, click the button below.
              </p>
              <button id="manual-check-btn" class="swal2-confirm swal2-styled" style="margin-top: 10px; background-color: #059669;">
                Check Payment Status
              </button>
            </div>
          `,
          icon: "info",
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: "Cancel",
          didOpen: () => {
            // Add manual check button handler
            const checkBtn = document.getElementById('manual-check-btn');
            if (checkBtn) {
              checkBtn.onclick = async () => {
                if (currentCheckoutIdRef.current && !paymentCompletedRef.current) {
                  const completed = await checkPaymentStatus(currentCheckoutIdRef.current, true);
                  if (!completed) {
                    Swal.fire({
                      title: "Not Confirmed Yet",
                      text: "Your payment hasn't been confirmed yet. Please wait a moment or check your M-Pesa messages.",
                      icon: "info",
                      confirmButtonText: "OK"
                    });
                  }
                }
              };
            }
            
            // Start polling for payment status - check every 5 seconds
            statusCheckIntervalRef.current = setInterval(async () => {
              if (currentCheckoutIdRef.current && !paymentCompletedRef.current) {
                const completed = await checkPaymentStatus(currentCheckoutIdRef.current);
                if (completed) {
                  // Payment was successful, close this modal
                  Swal.close();
                }
              }
            }, 5000);
            
            // Set timeout for payment confirmation - 3 minutes (180 seconds)
            // Increased to 3 minutes to allow more time
            timeoutRef.current = setTimeout(() => {
              if (!paymentCompletedRef.current) {
                console.log('Payment timeout reached after 3 minutes');
                if (statusCheckIntervalRef.current) {
                  clearInterval(statusCheckIntervalRef.current);
                  statusCheckIntervalRef.current = null;
                }
                
                // Don't auto-close, give user option to manually check
                Swal.fire({
                  title: "Payment Status Unknown",
                  html: `
                    <div style="text-align: center;">
                      <i class="fas fa-question-circle" style="font-size: 48px; color: #f59e0b;"></i>
                      <h3 style="margin: 15px 0;">Payment Not Confirmed Yet</h3>
                      <p>We haven't received confirmation of your payment.</p>
                      <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 15px; text-align: left;">
                        <p style="font-size: 0.85rem; margin: 0 0 8px 0; color: #92400e;">
                          <i class="fas fa-check-circle"></i> <strong>If you completed the payment:</strong>
                        </p>
                        <p style="font-size: 0.85rem; margin: 0 0 8px 15px; color: #92400e;">
                          • The confirmation may be delayed. Click "Check Now" to verify.
                        </p>
                        <p style="font-size: 0.85rem; margin: 0 0 8px 15px; color: #92400e;">
                          • Save the reference number above for support.
                        </p>
                        <p style="font-size: 0.85rem; margin: 0 15px; color: #92400e;">
                          • Check your M-Pesa messages for the transaction confirmation.
                        </p>
                      </div>
                      <button id="final-check-btn" class="swal2-confirm swal2-styled" style="margin-top: 20px; background-color: #059669;">
                        Check Payment Status Now
                      </button>
                    </div>
                  `,
                  icon: "warning",
                  showConfirmButton: false,
                  showCancelButton: true,
                  cancelButtonText: "Cancel",
                  didOpen: () => {
                    const finalCheckBtn = document.getElementById('final-check-btn');
                    if (finalCheckBtn) {
                      finalCheckBtn.onclick = async () => {
                        if (currentCheckoutIdRef.current) {
                          const completed = await checkPaymentStatus(currentCheckoutIdRef.current, true);
                          if (!completed) {
                            Swal.fire({
                              title: "Still Not Confirmed",
                              html: `
                                <div style="text-align: center;">
                                  <p>Your payment hasn't been confirmed yet.</p>
                                  <p style="margin-top: 10px;">Please save this reference number and contact support:</p>
                                  <div style="background: #f8f9ff; padding: 10px; border-radius: 8px; margin-top: 10px;">
                                    <strong>Reference: ${reference}</strong>
                                  </div>
                                  <p style="margin-top: 15px; font-size: 0.85rem; color: #666;">
                                    The payment may still be processed. You can try activating your subscription later.
                                  </p>
                                </div>
                              `,
                              icon: "info",
                              confirmButtonText: "OK"
                            });
                          }
                        }
                      };
                    }
                  }
                }).then((result) => {
                  if (result.dismiss === Swal.DismissReason.cancel) {
                    setIsProcessing(false);
                    paymentCompletedRef.current = false;
                  }
                });
                setIsProcessing(false);
              }
            }, 180000); // 3 minutes timeout
          }
        });
      } else {
        throw new Error(data.error || data.message || "Initiation failed");
      }
    } catch (error) {
      console.error('Payment error:', error);
      Swal.fire({
        title: "Payment Failed",
        html: `
          <div style="text-align: center;">
            <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #dc2626;"></i>
            <h3 style="margin: 15px 0;">Payment Failed</h3>
            <p>${error.message || "Unable to initiate payment. Please try again."}</p>
            <div style="background: #fef2f2; padding: 12px; border-radius: 8px; margin-top: 15px;">
              <p style="font-size: 0.85rem; margin: 0; color: #991b1b;">
                <i class="fas fa-info-circle"></i> Ensure your phone number is correct and you have sufficient M-Pesa balance.
              </p>
            </div>
          </div>
        `,
        icon: "error",
        confirmButtonText: "Try Again",
        confirmButtonColor: "#059669"
      });
      setIsProcessing(false);
      paymentCompletedRef.current = false;
    }
  };

  // Crypto payment - use USD price
  const getCryptoAddress = async () => {
    const usdPrice = getCurrentPriceInUsd();
    const params = {
      price_amount: parseFloat(usdPrice),
      price_currency: "usd",
      pay_currency: selectedCurrency.toLowerCase(),
    };
    const response = await npApi.createPayment(params);
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
      const response = await fetch(
        "https://api.nowpayments.io/v1/merchant/coins",
        {
          headers: { "x-api-key": "K80YG02-W464QP0-QR7E9EZ-QFY3ZGQ" },
        }
      );
      const data = await response.json();
      setCurrenciesArr(data.selectedCurrencies);
    };

    fetchCurrencies();
    if (paymentType === "crypto") getCryptoAddress();
  }, [selectedCurrency, price, paymentType]);

  // Force PayPal buttons to re-render when price changes
  useEffect(() => {
    if (paymentType === "paypal") {
      setPaypalKey(prev => prev + 1);
    }
  }, [price, paymentType]);

  // Handle payment method change
  const handlePaymentMethodChange = (methodId) => {
    setPaymentType(methodId);
    setIsProcessing(false);
    paymentCompletedRef.current = false;
  };

  // PayPal order creation
  const createPayPalOrder = (data, actions) => {
    const usdPrice = getCurrentPriceInUsd();
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: usdPrice,
            currency_code: "USD",
          },
          description: `${getSubscriptionPeriod()} VIP Subscription`,
        },
      ],
    });
  };

  // PayPal approval handler
  const onPayPalApprove = (data, actions) => {
    return actions.order.capture().then(function (details) {
      console.log("PayPal payment completed:", details);
      handleUpgrade();
    });
  };

  // PayPal error handler
  const onPayPalError = (err) => {
    console.error("PayPal error:", err);
    Swal.fire({
      title: "Payment Failed",
      text: "PayPal payment failed. Please try again.",
      icon: "error"
    });
  };

  // Helper to display price based on payment type
  const getDisplayPrice = () => {
    if (paymentType === "mpesa") {
      return `KSH ${price}`;
    } else {
      return `$${getCurrentPriceInUsd()}`;
    }
  };

  return (
    <PayPalScriptProvider options={paypalInitialOptions}>
      <div className="payment-container">
        <AppHelmet title="Payment" location="/pay" />

        <div className="payment-glass">
          <h2 className="payment-title">Select Payment Method</h2>

          <div className="method-selector">
            {paymentMethods.map((method) => (
              <label
                key={method.id}
                className={`method-option ${
                  paymentType === method.id ? "active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={method.id}
                  checked={paymentType === method.id}
                  onChange={() => handlePaymentMethodChange(method.id)}
                />
                {method.label}
              </label>
            ))}
          </div>

          <div className="plan-selector">
            {subscriptionPlans[paymentType].map((plan) => (
              <label
                key={plan.id}
                className={`plan-option ${price === plan.value ? "active" : ""}`}
              >
                <input
                  type="radio"
                  name="subscription-plan"
                  value={plan.value}
                  checked={price === plan.value}
                  onChange={() => setPrice(plan.value)}
                />
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
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="glass-select"
                >
                  {currenciesArr?.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="payment-info">
                <p>
                  Amount:{" "}
                  <span>
                    {payAmount} {payCurrency?.toUpperCase()}
                  </span>
                </p>
                <p>
                  Network: <span>{network?.toUpperCase()}</span>
                </p>
                <p>
                  Address: <span>{address}</span>
                </p>
              </div>

              <div className="address-copy">
                <input
                  type="text"
                  value={address || ""}
                  readOnly
                  ref={addressRef}
                  className="glass-input"
                />
                <button onClick={handleCopy} className="copy-btn">
                  {copied ? (
                    <Check className="icon" />
                  ) : (
                    <CopyAll className="icon" />
                  )}
                </button>
              </div>
            </div>
          ) : paymentType === "mpesa" ? (
            <div className="mpesa-payment">
              <h3>
                GET {getSubscriptionPeriod().toUpperCase()} VIP FOR {getDisplayPrice()}
              </h3>
              <button 
                onClick={handleMpesaPayment} 
                className="paystack-btn"
                disabled={isProcessing}
                style={{
                  background: isProcessing ? '#9ca3af' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  opacity: isProcessing ? 0.7 : 1,
                  cursor: isProcessing ? "not-allowed" : "pointer"
                }}
              >
                <i className={`fas ${isProcessing ? 'fa-spinner fa-spin' : 'fa-mobile-alt'}`} style={{ marginRight: '8px' }}></i>
                {isProcessing ? "Processing..." : "Pay with M-Pesa"}
              </button>
            </div>
          ) : (
            <div className="paypal-payment">
              <h3>
                GET {getSubscriptionPeriod().toUpperCase()} VIP FOR {getDisplayPrice()}
              </h3>
              <div className="paypal-buttons-container">
                <PayPalButtons
                  key={paypalKey}
                  style={{
                    layout: "horizontal",
                    color: "gold",
                    shape: "pill",
                    label: "pay"
                  }}
                  createOrder={createPayPalOrder}
                  onApprove={onPayPalApprove}
                  onError={onPayPalError}
                  forceReRender={[price]}
                />
              </div>
              <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
                Paying: {getDisplayPrice()} for {getSubscriptionPeriod()} VIP
              </p>
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