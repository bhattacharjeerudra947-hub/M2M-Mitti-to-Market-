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

  const totalAmount = deal.totalAmount || (deal.quantity * deal.agreedPrice) || 0;
  const upfrontAmount = Math.round((totalAmount / 2.0) * 100) / 100;
  const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const handlePay = async () => {
    setLoading(true);
    setError('');
    setStep('PROCESSING');

    try {
      // Step 1: Initialize demo transaction with backend validation (50% upfront escrow)
      const initRes = await createDemoPayment(deal.id || deal.dealId, {
        amount: upfrontAmount,
        paymentMethod,
        notes: `Simulated 50% upfront ${paymentMethod} sandbox escrow payment for Deal #${deal.dealId || deal.id}`,
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

  const handleClose = () => {
    setStep('SELECT');
    setError('');
    onClose();
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
              onClick={handleClose}
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {step === 'SELECT' && (
            <>
              {/* Amount Breakdown Card */}
              <div className="bg-gradient-to-br from-navy-50 to-emerald-50/40 p-4 rounded-2xl border border-navy-100 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-navy-600 block">Mandatory 50% Upfront Escrow</span>
                    <span className="text-[10px] text-emerald-700 font-medium">Milestone 1 · Required before dispatch</span>
                  </div>
                  <span className="text-xl font-extrabold text-navy-900">{formatINR(upfrontAmount)}</span>
                </div>
                <div className="border-t border-navy-200/50 pt-2 grid grid-cols-2 gap-2 text-[11px] text-navy-600">
                  <div>Total Deal Value: <span className="font-bold text-navy-900">{formatINR(totalAmount)}</span></div>
                  <div className="text-right">Remaining on Delivery: <span className="font-bold text-navy-900">{formatINR(upfrontAmount)}</span></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 pt-0.5">
                  <span>Quantity: {deal.quantity} {deal.unit || 'kg'}</span>
                  <span>Agreed Price: {formatINR(deal.agreedPrice)}/{deal.unit || 'kg'}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-navy-800">Select Sandbox Payment Channel</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                      paymentMethod === 'UPI'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                      paymentMethod === 'CARD'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('NET_BANKING')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                      paymentMethod === 'NET_BANKING'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Building className="w-5 h-5" />
                    <span>Net Banking</span>
                  </button>
                </div>
              </div>

              {/* Channel-Specific Input Fields */}
              {paymentMethod === 'UPI' && (
                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-navy-700">Virtual Payment Address (VPA)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="name@okaxis"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {['buyer@okhdfcbank', 'krishi.buyer@paytm', 'demo@okicici'].map((vpa) => (
                      <button
                        key={vpa}
                        type="button"
                        onClick={() => setUpiId(vpa)}
                        className="text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 font-mono transition"
                      >
                        {vpa}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="font-semibold text-navy-700">Simulated Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-navy-700">Expiry</label>
                      <input
                        type="text"
                        defaultValue="12/28"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-navy-700">CVV</label>
                      <input
                        type="password"
                        defaultValue="123"
                        maxLength="3"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'NET_BANKING' && (
                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-navy-700">Select Bank</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option>State Bank of India</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                    <option>Punjab National Bank</option>
                  </select>
                </div>
              )}

              {/* Escrow Guarantee Notice */}
              <div className="flex items-start gap-2 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong>100% Escrow Guarantee:</strong> Payment is held safely in Mitti2Market Escrow. Funds will NOT be released to the farmer until delivery is inspected and confirmed by the buyer.
                </p>
              </div>

              {/* Pay / Deposit Button */}
              <button
                type="button"
                onClick={handlePay}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                Deposit 50% Escrow ({formatINR(upfrontAmount)}) [Sandbox]
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
                onClick={handleClose}
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
