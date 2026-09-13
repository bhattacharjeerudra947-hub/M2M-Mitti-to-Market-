import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, CreditCard, Smartphone, Building, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { createDemoPayment, confirmDemoPayment } from '../api/dealApi';

export default function DemoPaymentModal({
  isOpen,
  onClose,
  deal,
  onPaymentSuccess = () => {},
}) {
  if (!isOpen || !deal) return null;

  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'CARD' | 'NET_BANKING'
  const [upiId, setUpiId] = useState('demo.buyer@okaxis');
  const [cardNumber, setCardNumber] = useState('4111 •••• •••• 1111');
  const [selectedBank, setSelectedBank] = useState('State Bank of India');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('SELECT'); // 'SELECT' | 'PROCESSING' | 'SUCCESS'
  const [error, setError] = useState('');
  const [txnResult, setTxnResult] = useState(null);

  const amount = deal.totalAmount || (deal.quantity * deal.agreedPrice) || 0;
  const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const handlePay = async () => {
    setLoading(true);
    setError('');
    setStep('PROCESSING');

    try {
      // Step 1: Initialize demo transaction with backend validation
      const initRes = await createDemoPayment(deal.id || deal.dealId, {
        paymentMethod,
        notes: `Simulated ${paymentMethod} sandbox payment for Deal #${deal.dealId || deal.id}`,
      });

      const txnId = initRes.transactionId;

      // Simulated network processing delay for realism
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 2: Confirm demo payment in backend
      const confirmRes = await confirmDemoPayment({
        dealId: deal.id || deal.dealId,
        transactionId: txnId,
        paymentMethod,
        notes: `Confirmed via ${paymentMethod} sandbox gateway`,
      });

      setTxnResult(confirmRes);
      setStep('SUCCESS');
      onPaymentSuccess(confirmRes);
    } catch (err) {
      setError(err?.message || 'Sandbox payment simulation failed.');
      setStep('SELECT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-navy-100 flex flex-col">
        {/* Header with Demo Sandbox Flag */}
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Escrow Gateway
                <span className="text-[10px] bg-amber-400 text-navy-900 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                  Demo Sandbox
                </span>
              </h3>
              <p className="text-xs text-navy-200">Deal: #{deal.dealId || deal.id} · {deal.cropName}</p>
            </div>
          </div>
          {step !== 'PROCESSING' && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-navy-200 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Demo Warning Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Sandbox Simulation Mode:</strong> No real bank accounts are debited. This simulates Razorpay & UPI Escrow locking for testing & hackathon demonstration.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          {step === 'SELECT' && (
            <>
              {/* Amount Breakdown */}
              <div className="bg-navy-50/60 rounded-2xl p-4 border border-navy-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-navy-500">Escrow Payable Amount</p>
                  <p className="text-2xl font-black text-navy-900">{formatINR(amount)}</p>
                </div>
                <div className="text-right text-[11px] text-navy-600">
                  <p>{deal.quantity} {deal.unit} @ {formatINR(deal.agreedPrice)}/{deal.unit}</p>
                  <p className="text-emerald-700 font-semibold mt-0.5 flex items-center gap-1 justify-end">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Escrow Protected
                  </p>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy-800">Select Sandbox Payment Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      paymentMethod === 'UPI'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-navy-700'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs">UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      paymentMethod === 'CARD'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-navy-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <span className="text-xs">Card (Test)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('NET_BANKING')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      paymentMethod === 'NET_BANKING'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-navy-700'
                    }`}
                  >
                    <Building className="w-5 h-5 text-purple-600" />
                    <span className="text-xs">NetBanking</span>
                  </button>
                </div>
              </div>

              {/* Method Specific Mock Details */}
              {paymentMethod === 'UPI' && (
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <label className="font-semibold text-navy-700">Virtual Payment Address (VPA)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-navy-900 font-mono"
                    placeholder="buyer@upi"
                  />
                  <p className="text-[10px] text-gray-500">
                    Simulates instant approval from Google Pay, PhonePe, or BHIM.
                  </p>
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <label className="font-semibold text-navy-700">Test Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    readOnly
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-navy-900 font-mono"
                  />
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-500">Expiry: </span>
                      <strong className="text-navy-800">12/29</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">CVV: </span>
                      <strong className="text-navy-800">123</strong>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'NET_BANKING' && (
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <label className="font-semibold text-navy-700">Select Sandbox Bank</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-navy-900"
                  >
                    <option>State Bank of India</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>Punjab National Bank</option>
                    <option>Axis Bank</option>
                  </select>
                </div>
              )}

              {/* Escrow Guarantee Statement */}
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  M2M Escrow Safety Protocol:
                </p>
                <p className="text-emerald-800">
                  Payment is held safely in Mitti2Market Escrow. Funds will NOT be released to the farmer until delivery is inspected and confirmed by the buyer.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handlePay}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                <Lock className="w-4 h-4" />
                Deposit {formatINR(amount)} to Escrow (Sandbox)
              </button>
            </>
          )}

          {step === 'PROCESSING' && (
            <div className="text-center py-10 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-base font-bold text-navy-900">Simulating Bank Authorization...</p>
                <p className="text-xs text-navy-500">Contacting Sandbox Escrow Gateway...</p>
              </div>
              <div className="max-w-xs mx-auto text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                Simulating UPI/Razorpay callback and atomic escrow ledger lock.
              </div>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-navy-900">Payment Secured in Escrow!</h4>
                <p className="text-xs text-navy-500 mt-1">Transaction verified by Mitti2Market Sandbox</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans">Transaction ID:</span>
                  <span className="font-bold text-navy-900">{txnResult?.transactionId || 'M2M-DEMO-TXN'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans">Amount Escrowed:</span>
                  <span className="font-bold text-emerald-700">{formatINR(txnResult?.amount || amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans">Status:</span>
                  <span className="font-bold text-emerald-600">PAID_ESCROW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-sans">Method:</span>
                  <span className="text-navy-800">{paymentMethod} Sandbox</span>
                </div>
              </div>

              <p className="text-[11px] text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                🛡️ The seller has been notified. Logistics dispatch and delivery tracking can now commence.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl text-xs transition"
              >
                Return to Deal Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
