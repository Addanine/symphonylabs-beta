"use client";

import { useState } from "react";
import Link from "next/link";
import NavigationWrapper from "~/components/NavigationWrapper";

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

const faqs: FAQItem[] = [
  {
    question: "Do you ship worldwide?",
    answer: "Yes, we ship internationally from the U.S. and E.U. Your order's origin warehouse is determined automatically at checkout.",
  },
  {
    question: "Are your products tested?",
    answer: "Yes. Unlike some other homebrewers, we test every single batch. You can scan your product's QR code to view the test for its batch. No item is sold without ensuring it meets the utmost standards.",
  },
  {
    question: "Are your ingredients tested for purity?",
    answer: "All APIs are also tested before use, with TLC testing and/or other third party testing.",
  },
  {
    question: "How can I contact support?",
    answer: (
      <>
        Email support@symphonylabs.cc or use the{" "}
        <Link href="/contact" className="underline hover:no-underline">
          contact form
        </Link>
        . We aim to respond within 48 hours.
      </>
    ),
  },
  {
    question: "Do you provide tracking for shipped orders?",
    answer: (
      <>
        We provide tracking on all orders. Check your order status{" "}
        <Link href="/track-order" className="underline hover:no-underline">
          here
        </Link>
        .
      </>
    ),
  },
  {
    question: "Are reships available?",
    answer: (
      <>
        Reships are available if the purchased product is seized by customs, or comes broken, damaged, or modified upon arrival.{" "}
        <Link href="/contact" className="underline hover:no-underline">
          Contact us
        </Link>{" "}
        for further specific inquiries or information.
      </>
    ),
  },
  {
    question: "How do I pay?",
    answer: "We accept cryptocurrency payments in BTC only (at the present moment).",
  },
  {
    question: "Can I get a return/refund?",
    answer: "Outside of customs-related issues we cannot offer returns or refunds.",
  },
  {
    question: "Are these as safe as pharmeceutical-grade injections?",
    answer: <>
      As homebrewers, we want to make it clear that <em>no</em> homebrewer can offer the same consistencies or guarantees that can be offered by proper pharmeceutical companies. However, we utilize third-party testing for each batch of product, as well as proper sterile compunding technique. If you believe you have recieved a product which you believe is unsafe, <Link href="/contact" className="underline hover:no-underline">contact us</Link>{" "} and we will provide a replacement if needed.
    </>,
  },
  {
    question: "How much do I take?",
    answer: (
      <>
        We do not provide dosing information. Seek out a trusted source such as a doctor or medical professional, or sites such as {" "}
        <a
          href="https://transfemscience.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          transfemscience.org
        </a>
        . (We do not endorse, nor have we verified, the accuracy and reliability of the linked information. Follow any guidelines therein at your own risk.)
      </>
    ),
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-white">
      <NavigationWrapper />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-wide mb-8">frequently asked questions</h1>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="brutalist-border bg-white">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 text-left flex items-center justify-between hover:translate-x-1 hover:translate-y-1 transition-transform"
              >
                <h3 className="text-base font-bold tracking-wide pr-4">
                  {faq.question}
                </h3>
                <span className="text-2xl font-bold flex-shrink-0">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                  <p className="text-sm tracking-wide leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
