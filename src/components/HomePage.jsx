function DashboardSummary({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card p-5">
          <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
            <i className={`fa ${stat.icon} text-white`}></i>
          </div>
          <p className="text-sm text-slate-500">{stat.label}</p>
          <h3 className="mt-1 text-3xl font-extrabold text-slate-800">{stat.value}</h3>
          {stat.sub && <p className="mt-1 text-xs text-slate-400">{stat.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export default DashboardSummary;
