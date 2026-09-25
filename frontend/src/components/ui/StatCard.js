import React from "react";

const StatCard = ({ icon: Icon, label, value, trend, iconBg = "bg-rideflow-orange/10", iconColor = "text-rideflow-orange" }) => (
  <div className="bg-white rounded-xl border border-black/5 p-5 flex items-center justify-between">
    <div>
      <p className="text-sm text-rideflow-navy/60">{label}</p>
      <p className="text-2xl font-bold text-rideflow-navy mt-1">{value}</p>
      {trend && <p className={`text-xs mt-1 ${trend.startsWith("-") ? "text-red-600" : "text-emerald-600"}`}>{trend}</p>}
    </div>
    {Icon && (
      <div className={`w-11 h-11 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
        <Icon size={20} />
      </div>
    )}
  </div>
);

export default StatCard;
