import React, { useState, useEffect } from "react";
import { User, Building, MapPin } from "lucide-react";

export const VendorProfile = () => {
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form states
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [experience, setExperience] = useState<string>("beginner");
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [cities, setCities] = useState("");
  const [radius, setRadius] = useState<number>(10);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const categories = [
    "plumbing", "electrical", "carpentry", "cleaning", "painting",
    "appliance-repair", "hvac", "landscaping", "moving", "pest-control", "handyman"
  ];

  // Fetch vendor profile when component mounts
  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await fetch("/api/vendors/me", { credentials: "include" });
        const data = await res.json();

        setBusinessName(data.businessName || "");
        setExperience(data.experience || "beginner");
        setServiceCategories(data.serviceCategories || []);
        setDescription(data.description || "");
        setCities((data.serviceArea?.cities || []).join(", "));
        setRadius(Number(data.serviceArea?.radius) || 0);
      } catch (error) {
        console.error("Error fetching vendor:", error);
      }
    };
    fetchVendor();
  }, []);

  // Toggle category checkbox
  const handleCategoryChange = (category: string) => {
    setServiceCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Save profile
  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("businessName", businessName);
      formData.append("experience", experience);
      formData.append("serviceCategories", JSON.stringify(serviceCategories));
      formData.append("description", description);
      formData.append("cities", JSON.stringify(cities.split(",").map((c) => c.trim())));
      formData.append("radius", radius.toString());
      if (profilePhoto) formData.append("profilePhoto", profilePhoto);

      const res = await fetch("/api/vendors/update-profile", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to update");

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage({ type: "error", text: "Failed to update profile." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === "profile"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Business Profile
                </button>
              </nav>
            </div>
          </div>

          {/* Profile Tab */}
          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                  Business Profile
                </h2>

                {message && (
                  <div
                    className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                      message.type === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <form className="space-y-6" onSubmit={handleProfileSave}>
                  {/* Profile Photo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Photo
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {profilePhoto ? (
                          <img
                            src={URL.createObjectURL(profilePhoto)}
                            alt="Profile"
                            className="w-24 h-24 object-cover"
                          />
                        ) : (
                          <User className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProfilePhoto(e.target.files ? e.target.files[0] : null)
                        }
                      />
                    </div>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Level
                    </label>
                    <select
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="beginner">Beginner (0–1 year)</option>
                      <option value="intermediate">Intermediate (2–4 years)</option>
                      <option value="moderate">Moderate (5–9 years)</option>
                      <option value="experienced">Experienced (10+ years)</option>
                    </select>
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Categories
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {categories.map((category) => (
                        <label key={category} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={serviceCategories.includes(category)}
                            onChange={() => handleCategoryChange(category)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm capitalize text-gray-700">
                            {category.replace("-", " ")}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Description
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Service Area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Area
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={cities}
                          onChange={(e) => setCities(e.target.value)}
                          placeholder="Cities (comma separated)"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <select
                          value={radius}
                          onChange={(e) => setRadius(Number(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={5}>Up to 5 km</option>
                          <option value={10}>Up to 10 km</option>
              
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !businessName || serviceCategories.length === 0}
                    className={`w-full py-3 px-4 rounded-lg font-semibold text-white ${
                      loading || !businessName || serviceCategories.length === 0
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {loading ? "Saving..." : "Save Profile"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
