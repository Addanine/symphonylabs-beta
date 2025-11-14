"use client";

import { useState } from "react";
import NavigationWrapper from "~/components/NavigationWrapper";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would send this data to your backend
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

  return (
    <main className="min-h-screen bg-white">
      <NavigationWrapper />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-wide mb-8">contact</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="brutalist-border bg-white p-8 mb-6">
              <h2 className="text-xl font-bold tracking-wide mb-6">get in touch</h2>
              <p className="text-sm tracking-wide leading-relaxed mb-6">
                have a question or need support? fill out the form and we&apos;ll get
                back to you as soon as possible.
              </p>
              <div className="space-y-3 text-sm tracking-wide">
                <div>
                  <div className="font-bold mb-1">email</div>
                  <div>support@symphonylabs.com</div>
                </div>
                <div>
                  <div className="font-bold mb-1">response time</div>
                  <div>typically within 24 hours</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <form onSubmit={handleSubmit} className="brutalist-border bg-white p-8">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold tracking-wide mb-2">
                    name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-brutalist w-full"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-bold tracking-wide mb-2">
                    email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-brutalist w-full"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-bold tracking-wide mb-2">
                    subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input-brutalist w-full"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-bold tracking-wide mb-2">
                    message
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="input-brutalist w-full min-h-[120px] resize-y"
                    required
                  />
                </div>

                {submitted ? (
                  <div className="brutalist-border bg-white p-4 text-center">
                    <span className="text-sm font-bold tracking-wide">message sent!</span>
                  </div>
                ) : (
                  <button type="submit" className="btn-brutalist-black w-full">
                    send message
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
