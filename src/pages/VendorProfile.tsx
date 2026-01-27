import React, { useState, useEffect } from "react";
import { User, Building, MapPin, Camera } from "lucide-react";

export const VendorProfile = () => {
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form states
  const [profilePhoto, setProfilePhoto] = useState<File | null> (null);
  const [businessName, setBusinessName] = useState("");
  const [experience, setExperience] = useState("");
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [cities, setCities] = useState("");
  const [radius, setRadius] = useState("");

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
        setExperience(data.experience || "");
        setServiceCategories(data.serviceCategories || []);
        setDescription(data.description || "");
        setCities((data.serviceArea?.cities || []).join(", "));
        setRadius(data.serviceArea?.radius || "");
      } catch (error) {
        console.error("Error fetching vendor:", error);
      }
    };
    fetchVendor();
  }, []);

  // Toggle category checkbox
  const handleCategoryChange = (category:string) => {
    setServiceCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Save profile
  const handleProfileSave = async (e:React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/vendors/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessName,
          experience,
          serviceCategories,
          description,
          serviceArea: {
            cities: cities.split(",").map((c) => c.trim()),
            radius,
          },
        }),
      });
      const data = await res.json();
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to update profile.");
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

                <form className="space-y-6" onSubmit={handleProfileSave}>
                  {/* Profile Photo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Photo
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                        {profilePhoto ? (
                          <img
                            src={URL.createObjectURL(profilePhoto)}
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfilePhoto(e.target.files ? e.target.files[0] : null)}

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
                      />
                    </div>
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
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
                        <input
                          type="number"
                          value={radius}
                          onChange={(e) => setRadius(e.target.value)}
                          placeholder="Service radius (km)"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Save Profile
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
