import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Waypoints } from "lucide-react";

const url = `${process.env.REACT_APP_BACKEND_SERVER_URI}/user/signup`;

const emptyForm = {
  fullName: "",
  dateOfBirth: "",
  email: "",
  password: "",
  confirmPassword: "",
  companyName: "",
  role: "dispatcher",
};

const errorMessageFrom = (error, fallback) =>
  (error.response && error.response.data && error.response.data.message) || fallback;

// Mirrors the backend's rules (models/userValidator.js) so obvious mistakes are
// caught before a round trip; the backend remains the source of truth.
const validateForm = (formData) => {
  if (!formData.fullName.trim()) return "Full name is required";
  if (!formData.dateOfBirth) return "Date of birth is required";
  if (new Date(formData.dateOfBirth).getTime() > Date.now()) return "Date of birth cannot be in the future";
  if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) return "Please input a valid email";
  if (formData.password.length < 8) return "Password must be 8 or more characters";
  if (formData.password !== formData.confirmPassword) return "Passwords do not match";
  if (!formData.companyName.trim()) return "Company name is required";
  if (!["dispatcher", "manager"].includes(formData.role)) return "Please select a role";
  return "";
};

const Register = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = ({ currentTarget: input }) => {
    setFormData({ ...formData, [input.name]: input.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(url, formData);
      window.alert("Registration successful! Please log in.");
      navigate("/login");
    } catch (error) {
      setError(errorMessageFrom(error, "Could not create your account. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Waypoints size={24} className="text-indigo-600" />
          <span className="font-bold text-xl text-slate-900">RideFlow</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Create your account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              name="companyName"
              placeholder="Your transportation company"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="dispatcher">Dispatcher</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors shadow-sm mt-2"
          >
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
