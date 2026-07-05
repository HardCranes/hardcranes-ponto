import ColaboradorForm from "@/components/admin/ColaboradorForm";

export default function NovoColaboradorPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Cadastrar colaborador</h1>
      <ColaboradorForm />
    </div>
  );
}
