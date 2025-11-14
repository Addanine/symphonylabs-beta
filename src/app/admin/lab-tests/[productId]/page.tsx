"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Navigation from "~/components/Navigation";
import { supabase, type Product, type LabTest } from "~/lib/supabase";
import { AdminAuthProvider, useAdminAuth } from "~/context/AdminAuthContext";
import AdminLogin from "~/components/AdminLogin";
import { useToast } from "~/context/ToastContext";

function LabTestsPageContent() {
  const { isAuthenticated, isLoading, login, logout } = useAdminAuth();
  const { showToast } = useToast();
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    batch: "",
    purity: "",
    link: "",
  });

  const fetchProductAndTests = useCallback(async () => {
    try {
      const productId = params.productId as string;

      // Fetch product
      const productResult = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (productResult.error) throw productResult.error;
      setProduct(productResult.data as Product);

      // Fetch lab tests
      const labTestsResult = await supabase
        .from("lab_tests")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (labTestsResult.error) throw labTestsResult.error;
      setLabTests(labTestsResult.data ?? []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [params.productId]);

  useEffect(() => {
    void fetchProductAndTests();
  }, [fetchProductAndTests]);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTest(null);
    setFormData({
      batch: "",
      purity: "",
      link: "",
    });
  };

  const handleEdit = (test: LabTest) => {
    setEditingTest(test);
    setIsCreating(false);
    setFormData({
      batch: test.batch,
      purity: test.purity,
      link: test.link,
    });
  };

  const handleCancel = () => {
    setEditingTest(null);
    setIsCreating(false);
    setFormData({
      batch: "",
      purity: "",
      link: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const testData = {
      product_id: params.productId as string,
      batch: formData.batch,
      purity: formData.purity,
      link: formData.link,
    };

    try {
      if (editingTest) {
        // Update existing lab test
        const { error } = await supabase
          .from("lab_tests")
          .update(testData)
          .eq("id", editingTest.id);

        if (error) throw error;
      } else {
        // Create new lab test
        const { error } = await supabase
          .from("lab_tests")
          .insert([testData]);

        if (error) throw error;
      }

      await fetchProductAndTests();
      handleCancel();
    } catch (error) {
      console.error("Error saving lab test:", error);
      showToast("Failed to save lab test. Please try again.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("are you sure you want to delete this lab test?")) return;

    try {
      const { error } = await supabase
        .from("lab_tests")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchProductAndTests();
    } catch (error) {
      console.error("Error deleting lab test:", error);
      showToast("Failed to delete lab test. Please try again.", "error");
    }
  };

  if (isLoading || loading) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="text-4xl mb-4 animate-pulse">[ loading ]</div>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} />;
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="text-6xl mb-6">[ ! ]</div>
            <h2 className="text-2xl font-bold tracking-wide mb-4">product not found</h2>
            <button
              onClick={() => router.push("/admin")}
              className="btn-brutalist-black"
            >
              back to admin
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="btn-brutalist text-xs mb-4"
            >
              ← back to products
            </button>
            <h1 className="text-3xl font-bold tracking-wide mb-2">
              lab tests - {product.name}
            </h1>
            <div className="h-[3px] w-20 bg-black"></div>
          </div>
          <div className="flex gap-3">
            {!isCreating && !editingTest && (
              <button onClick={handleCreate} className="btn-brutalist-black">
                add lab test
              </button>
            )}
            <button onClick={logout} className="btn-brutalist text-xs">
              logout
            </button>
          </div>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingTest) && (
          <div className="brutalist-border bg-white p-6 mb-8">
            <h2 className="text-xl font-bold tracking-wide mb-4">
              {editingTest ? "edit lab test" : "add lab test"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="batch" className="block text-sm font-bold tracking-wide mb-2">
                  batch number
                </label>
                <input
                  type="text"
                  id="batch"
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  className="input-brutalist w-full"
                  placeholder="e.g., BATCH-2024-001"
                  required
                />
              </div>

              <div>
                <label htmlFor="purity" className="block text-sm font-bold tracking-wide mb-2">
                  purity
                </label>
                <input
                  type="text"
                  id="purity"
                  value={formData.purity}
                  onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                  className="input-brutalist w-full"
                  placeholder="e.g., 99.9% or >99%"
                  required
                />
              </div>

              <div>
                <label htmlFor="link" className="block text-sm font-bold tracking-wide mb-2">
                  results link (url)
                </label>
                <input
                  type="url"
                  id="link"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="input-brutalist w-full"
                  placeholder="https://example.com/lab-results.pdf"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn-brutalist-black">
                  {editingTest ? "update lab test" : "add lab test"}
                </button>
                <button type="button" onClick={handleCancel} className="btn-brutalist">
                  cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lab Tests List */}
        <div className="space-y-4">
          {labTests.length === 0 ? (
            <div className="text-center py-16 brutalist-border bg-white">
              <div className="text-4xl mb-4">[ ]</div>
              <p className="text-sm tracking-wide">no lab tests yet. add one to get started.</p>
            </div>
          ) : (
            labTests.map((test) => (
              <div key={test.id} className="brutalist-border bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div>
                    <div className="text-xs tracking-wide opacity-60 mb-1">batch</div>
                    <div className="font-bold tracking-wide">{test.batch}</div>
                  </div>
                  <div>
                    <div className="text-xs tracking-wide opacity-60 mb-1">purity</div>
                    <div className="font-bold tracking-wide">{test.purity}</div>
                  </div>
                  <div>
                    <div className="text-xs tracking-wide opacity-60 mb-1">tested</div>
                    <div className="text-xs tracking-wide">
                      {new Date(test.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <a
                      href={test.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs tracking-wide hover:opacity-50 transition-opacity underline"
                    >
                      view results →
                    </a>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleEdit(test)}
                      className="btn-brutalist text-xs px-4 py-2"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => handleDelete(test.id)}
                      className="btn-brutalist text-xs px-4 py-2"
                    >
                      delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

export default function LabTestsPage() {
  return (
    <AdminAuthProvider>
      <LabTestsPageContent />
    </AdminAuthProvider>
  );
}
