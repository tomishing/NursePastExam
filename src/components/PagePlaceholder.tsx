type Props = {
  title: string;
  description: string;
};

// Temporary page body until each screen is built in its phase.
export default function PagePlaceholder({ title, description }: Props) {
  return (
    <section>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
    </section>
  );
}
