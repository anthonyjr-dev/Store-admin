function PageSection({ title, description }) {
  return (
    <section className="card p-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-slate-500">{description}</p>
    </section>
  );
}

export default PageSection;
