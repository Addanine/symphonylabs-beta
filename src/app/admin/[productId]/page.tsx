"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navigation from "~/components/Navigation";
import { supabase, type Product, type ModifierGroup, type ModifierOption } from "~/lib/supabase";
import Image from "next/image";
import { AdminAuthProvider, useAdminAuth } from "~/context/AdminAuthContext";
import AdminLogin from "~/components/AdminLogin";
import MarkdownPreview from "~/components/MarkdownPreview";
import { useToast } from "~/context/ToastContext";

function ProductEditContent() {
  const { isAuthenticated, isLoading, login, logout } = useAdminAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const isNewProduct = productId === "new";

  const [loading, setLoading] = useState(!isNewProduct);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    discount: "0",
    description: "",
    short_description: "",
    image: "",
    stock: "0",
    images: [] as string[],
    modifiers: [] as ModifierGroup[],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [productHidden, setProductHidden] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      const result = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (result.error) throw result.error;

      if (result.data) {
        const product = result.data as Product;
        setFormData({
          name: product.name,
          price: product.price.toString(),
          discount: (product.discount ?? 0).toString(),
          description: product.description,
          short_description: product.short_description ?? "",
          image: product.image,
          stock: product.stock.toString(),
          images: product.images ?? [],
          modifiers: product.modifiers ?? [],
        });
        setProductHidden(product.hidden ?? false);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      showToast("Failed to load product. Please try again.", "error");
      router.push("/admin");
    } finally {
      setLoading(false);
    }
  }, [productId, router, showToast]);

  useEffect(() => {
    if (isAuthenticated && !isNewProduct) {
      void fetchProduct();
    } else if (isNewProduct) {
      setLoading(false);
    }
  }, [isAuthenticated, isNewProduct, fetchProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const discountValue = parseInt(formData.discount) || 0;
    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      discount: discountValue,
      description: formData.description,
      short_description: formData.short_description || null,
      image: formData.image,
      stock: parseInt(formData.stock),
      images: formData.images.length > 0 ? formData.images : null,
      modifiers: formData.modifiers.length > 0 ? formData.modifiers : null,
    };

    try {
      if (isNewProduct) {
        // Create new product
        const { error } = await supabase
          .from("products")
          .insert([productData]);

        if (error) throw error;
      } else {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", productId);

        if (error) throw error;
      }

      router.push("/admin");
    } catch (error) {
      console.error("Error saving product:", error);
      showToast("Failed to save product. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async () => {
    try {
      const token = localStorage.getItem("admin_token");

      if (!token) {
        showToast("Authentication token not found. Please log in again.", "error");
        logout();
        return;
      }

      const response = await fetch("/api/products/toggle-visibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: productId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle product visibility");
      }

      const data = await response.json() as { success: boolean; hidden: boolean };
      setProductHidden(data.hidden);
      showToast(`Product is now ${data.hidden ? "hidden" : "visible"} in the store.`, "success");
    } catch (error) {
      console.error("Error toggling product visibility:", error);
      showToast("Failed to toggle product visibility. Please try again.", "error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json() as { error: string };
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json() as { url: string; fileName: string };

      // Insert markdown link at end of description
      const markdownLink = `[${data.fileName}](${data.url})`;
      setFormData(prev => ({
        ...prev,
        description: prev.description + `\n\n${markdownLink}`
      }));

      showToast("Document uploaded successfully! Link added to description.", "success");
    } catch (error) {
      console.error("Error uploading file:", error);
      showToast(error instanceof Error ? error.message : "Failed to upload file", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast("File size exceeds 10MB limit", "error");
      e.target.value = "";
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.", "error");
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/products/upload-image", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json() as { success?: boolean; url?: string; fileName?: string; error?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Upload failed");
      }

      if (!data.url) {
        throw new Error("No URL returned from upload");
      }

      // Add image to the images array
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, data.url!],
        // Set as main image if no main image is set
        image: prev.image || data.url!,
      }));

      showToast("Image uploaded successfully!", "success");
    } catch (error) {
      console.error("Error uploading image:", error);
      showToast(error instanceof Error ? error.message : "Failed to upload image", "error");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // Modifier management functions
  const addModifierGroup = () => {
    const newGroup: ModifierGroup = {
      id: `group_${Date.now()}`,
      label: "",
      required: false,
      options: [],
    };
    setFormData(prev => ({
      ...prev,
      modifiers: [...prev.modifiers, newGroup],
    }));
  };

  const updateModifierGroup = (groupId: string, updates: Partial<ModifierGroup>) => {
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.map(group =>
        group.id === groupId ? { ...group, ...updates } : group
      ),
    }));
  };

  const removeModifierGroup = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.filter(group => group.id !== groupId),
    }));
  };

  const addModifierOption = (groupId: string) => {
    const newOption: ModifierOption = {
      id: `option_${Date.now()}`,
      label: "",
      priceAdjustment: 0,
    };
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.map(group =>
        group.id === groupId
          ? { ...group, options: [...group.options, newOption] }
          : group
      ),
    }));
  };

  const updateModifierOption = (groupId: string, optionId: string, updates: Partial<ModifierOption>) => {
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.map(group =>
        group.id === groupId
          ? {
              ...group,
              options: group.options.map(option =>
                option.id === optionId ? { ...option, ...updates } : option
              ),
            }
          : group
      ),
    }));
  };

  const removeModifierOption = (groupId: string, optionId: string) => {
    setFormData(prev => ({
      ...prev,
      modifiers: prev.modifiers.map(group =>
        group.id === groupId
          ? { ...group, options: group.options.filter(option => option.id !== optionId) }
          : group
      ),
    }));
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

  return (
    <main className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm tracking-wide">
            <Link href="/admin" className="hover:opacity-60 transition-opacity">
              admin
            </Link>
            <span>/</span>
            <Link href="/admin" className="hover:opacity-60 transition-opacity">
              products
            </Link>
            <span>/</span>
            <span className="font-bold">
              {isNewProduct ? "new product" : formData.name || "edit product"}
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-wide">
              {isNewProduct ? "create new product" : `edit: ${formData.name}`}
            </h1>
            {!isNewProduct && productHidden && (
              <div className="bg-black text-white px-3 py-1 text-xs font-bold brutalist-border">
                HIDDEN FROM STORE
              </div>
            )}
          </div>
          <div className="h-[3px] w-20 bg-black"></div>
        </div>

        {/* Product Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="brutalist-border bg-white p-6">
            <h2 className="text-xl font-bold tracking-wide mb-4">basic information</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-bold tracking-wide mb-2">
                  product name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-brutalist w-full"
                  required
                  placeholder="Enter product name"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="price" className="block text-sm font-bold tracking-wide mb-2">
                    price (usd)
                  </label>
                  <input
                    type="number"
                    id="price"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-brutalist w-full"
                    required
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label htmlFor="discount" className="block text-sm font-bold tracking-wide mb-2">
                    discount (%)
                  </label>
                  <input
                    type="number"
                    id="discount"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="input-brutalist w-full"
                    placeholder="0"
                  />
                  <p className="text-xs tracking-wide mt-1 opacity-60">
                    {formData.discount && parseFloat(formData.discount) > 0
                      ? `Final: $${(parseFloat(formData.price || "0") * (1 - parseFloat(formData.discount) / 100)).toFixed(2)}`
                      : "No discount"}
                  </p>
                </div>

                <div>
                  <label htmlFor="stock" className="block text-sm font-bold tracking-wide mb-2">
                    stock quantity
                  </label>
                  <input
                    type="number"
                    id="stock"
                    min="0"
                    step="1"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="input-brutalist w-full"
                    required
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="short_description" className="block text-sm font-bold tracking-wide mb-2">
                  short description
                </label>
                <textarea
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  className="input-brutalist w-full min-h-[80px]"
                  placeholder="Brief description shown on product cards in the store"
                />
                <p className="text-xs tracking-wide mt-1 opacity-60">
                  shown on the store page - keep it short and concise
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="brutalist-border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-wide">full description</h2>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="btn-brutalist text-xs px-4 py-2"
              >
                {showPreview ? "edit" : "preview"}
              </button>
            </div>

            {!showPreview ? (
              <>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-brutalist w-full min-h-[300px] font-mono text-sm"
                  required
                  placeholder="Enter full product description with markdown formatting..."
                />
                <div className="text-xs tracking-wide mt-3 space-y-1 opacity-60">
                  <p>✓ supports markdown formatting</p>
                  <p>✓ use **bold**, *italic*, [links](url), # headings, lists, etc.</p>
                </div>
              </>
            ) : (
              <div className="brutalist-border bg-white p-6 min-h-[300px] max-h-[500px] overflow-y-auto">
                <MarkdownPreview content={formData.description} />
              </div>
            )}

            {/* Document Upload */}
            <div className="mt-4 pt-4 border-t-2 border-black">
              <label className="block text-sm font-bold tracking-wide mb-2">
                upload document (pdf, doc, txt)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="text-xs"
                  id="document-upload"
                />
                {uploading && (
                  <span className="text-xs tracking-wide animate-pulse">
                    uploading...
                  </span>
                )}
              </div>
              <p className="text-xs tracking-wide mt-2 opacity-60">
                upload a document and it will be automatically linked in the description
              </p>
            </div>
          </div>

          {/* Images */}
          <div className="brutalist-border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-wide">product images</h2>
              <div className="flex gap-2">
                <label className="btn-brutalist-black text-xs px-4 py-2 cursor-pointer">
                  {uploadingImage ? "uploading..." : "+ upload image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, images: [...prev.images, ''] }))}
                  className="btn-brutalist text-xs px-4 py-2"
                >
                  + add url slot
                </button>
              </div>
            </div>

            <div className="text-xs tracking-wide mb-4 space-y-1 opacity-60 bg-gray-50 p-4 brutalist-border">
              <p>✓ The <strong>main image</strong> (first image) is shown in the store listing</p>
              <p>✓ All images are shown in the carousel on the product detail page</p>
              <p>✓ Upload images to storage or enter URLs manually</p>
            </div>

            {/* Image Slots */}
            <div className="space-y-4">
              {formData.images.length > 0 ? (
                formData.images.map((imageUrl, index) => (
                  <div key={index} className="brutalist-border bg-white p-4">
                    <div className="flex items-start gap-4">
                      {/* Image Preview */}
                      <div className="relative w-32 h-32 brutalist-border flex-shrink-0 bg-gray-50">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={`Product image ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="128px"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl opacity-30">{index + 1}</span>
                          </div>
                        )}
                        {index === 0 && (
                          <div className="absolute -top-2 -left-2 bg-black text-white px-3 py-1 text-xs font-bold">
                            ★ MAIN
                          </div>
                        )}
                        {index > 0 && (
                          <div className="absolute -top-2 -left-2 bg-white brutalist-border px-3 py-1 text-xs font-bold">
                            {index + 1}
                          </div>
                        )}
                      </div>

                      {/* URL Input */}
                      <div className="flex-1">
                        <label className="block text-xs font-bold tracking-wide mb-2">
                          {index === 0 ? 'main image url' : `carousel image ${index + 1} url`}
                        </label>
                        <input
                          type="text"
                          value={imageUrl}
                          onChange={(e) => {
                            const newImages = [...formData.images];
                            newImages[index] = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              images: newImages,
                              image: index === 0 ? e.target.value : prev.image,
                            }));
                          }}
                          className="input-brutalist w-full text-sm"
                          placeholder="/products/image.jpg or https://example.com/image.jpg"
                        />
                      </div>

                      {/* Remove Button */}
                      {formData.images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = formData.images.filter((_, i) => i !== index);
                            setFormData(prev => ({
                              ...prev,
                              images: newImages,
                              image: newImages[0] ?? '',
                            }));
                          }}
                          className="btn-brutalist text-xs px-4 py-2 hover:bg-red-50"
                        >
                          remove
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-gray-50 brutalist-border">
                  <div className="text-5xl mb-3">[ ]</div>
                  <p className="text-sm tracking-wide opacity-60 mb-4">
                    no image slots yet
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, images: [''] }))}
                    className="btn-brutalist-black text-xs px-4 py-2"
                  >
                    add first image
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Product Modifiers */}
          <div className="brutalist-border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-wide">product options & modifiers</h2>
              <button
                type="button"
                onClick={addModifierGroup}
                className="btn-brutalist-black text-xs px-4 py-2"
              >
                + add option group
              </button>
            </div>
            <p className="text-xs tracking-wide mb-4 opacity-60">
              create customizable options like color, size, etc. with price adjustments
            </p>

            {formData.modifiers.length > 0 ? (
              <div className="space-y-4">
                {formData.modifiers.map((group) => (
                  <div key={group.id} className="brutalist-border bg-white p-4">
                    {/* Group Header */}
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={group.label}
                          onChange={(e) => updateModifierGroup(group.id, { label: e.target.value })}
                          className="input-brutalist w-full text-sm"
                          placeholder="Option name (e.g., Label Color, Size)"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs px-3 brutalist-border bg-gray-50">
                        <input
                          type="checkbox"
                          checked={group.required}
                          onChange={(e) => updateModifierGroup(group.id, { required: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span>required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeModifierGroup(group.id)}
                        className="btn-brutalist text-xs px-4 py-2"
                      >
                        remove group
                      </button>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      {group.options.map((option) => (
                        <div key={option.id} className="brutalist-border bg-gray-50 p-3">
                          <div className="grid grid-cols-12 gap-2 items-start">
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) => updateModifierOption(group.id, option.id, { label: e.target.value })}
                                className="input-brutalist w-full text-xs"
                                placeholder="Option label (e.g., Green)"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                step="0.01"
                                value={option.priceAdjustment}
                                onChange={(e) => updateModifierOption(group.id, option.id, { priceAdjustment: parseFloat(e.target.value) })}
                                className="input-brutalist w-full text-xs"
                                placeholder="Price +/-"
                              />
                              <span className="text-xs opacity-60">price adj.</span>
                            </div>
                            <div className="col-span-4">
                              <select
                                value={option.dependsOn ? `${option.dependsOn.groupId}:${option.dependsOn.optionId}` : ""}
                                onChange={(e) => {
                                  if (e.target.value === "") {
                                    const optionCopy = { ...option };
                                    delete optionCopy.dependsOn;
                                    updateModifierOption(group.id, option.id, optionCopy);
                                  } else {
                                    const [depGroupId, depOptionId] = e.target.value.split(":");
                                    updateModifierOption(group.id, option.id, {
                                      dependsOn: { groupId: depGroupId!, optionId: depOptionId! }
                                    });
                                  }
                                }}
                                className="input-brutalist w-full text-xs"
                              >
                                <option value="">No dependency</option>
                                {formData.modifiers
                                  .filter(g => g.id !== group.id)
                                  .map(depGroup => (
                                    <optgroup key={depGroup.id} label={depGroup.label || `Group ${formData.modifiers.indexOf(depGroup) + 1}`}>
                                      {depGroup.options.map(depOption => (
                                        <option key={depOption.id} value={`${depGroup.id}:${depOption.id}`}>
                                          {depOption.label || "Unnamed option"}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))}
                              </select>
                              <span className="text-xs opacity-60">show if...</span>
                            </div>
                            <div className="col-span-1 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => removeModifierOption(group.id, option.id)}
                                className="text-lg hover:opacity-50"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addModifierOption(group.id)}
                        className="btn-brutalist text-xs px-4 py-2 w-full"
                      >
                        + add option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 brutalist-border">
                <div className="text-5xl mb-3">[ ]</div>
                <p className="text-sm tracking-wide opacity-60 mb-4">
                  no option groups yet
                </p>
                <button
                  type="button"
                  onClick={addModifierGroup}
                  className="btn-brutalist-black text-xs px-4 py-2"
                >
                  add first option group
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="btn-brutalist-black px-8 py-3"
              disabled={saving}
            >
              {saving ? "saving..." : (isNewProduct ? "create product" : "update product")}
            </button>
            {!isNewProduct && (
              <button
                type="button"
                onClick={handleToggleVisibility}
                className={`btn-brutalist px-8 py-3 ${productHidden ? 'bg-yellow-50' : ''}`}
                disabled={saving}
              >
                {productHidden ? "show in store" : "hide from store"}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="btn-brutalist px-8 py-3"
              disabled={saving}
            >
              cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function ProductEditPage() {
  return (
    <AdminAuthProvider>
      <ProductEditContent />
    </AdminAuthProvider>
  );
}
