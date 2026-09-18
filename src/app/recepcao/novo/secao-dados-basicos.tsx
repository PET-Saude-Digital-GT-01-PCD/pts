import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MensagemBusca = { tipo: "erro" | "aviso" | "sucesso"; texto: string } | null;

export function SecaoDadosBasicos({
  cpf,
  cns,
  nome,
  dtnasc,
  sexo,
  municipioOrigem,
  endereco,
  destaqueGeral,
  buscando,
  mensagemBusca,
  onCpfChange,
  onCnsChange,
  onNomeChange,
  onDtnascChange,
  onSexoChange,
  onMunicipioOrigemChange,
  onEnderecoChange,
  onBuscarEsus,
}: {
  cpf: string;
  cns: string;
  nome: string;
  dtnasc: string;
  sexo: "MASCULINO" | "FEMININO" | "OUTRO";
  municipioOrigem: string;
  endereco: string;
  destaqueGeral: string;
  buscando: boolean;
  mensagemBusca: MensagemBusca;
  onCpfChange: (v: string) => void;
  onCnsChange: (v: string) => void;
  onNomeChange: (v: string) => void;
  onDtnascChange: (v: string) => void;
  onSexoChange: (v: "MASCULINO" | "FEMININO" | "OUTRO") => void;
  onMunicipioOrigemChange: (v: string) => void;
  onEnderecoChange: (v: string) => void;
  onBuscarEsus: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-end gap-2">
        <div className="grid gap-2 flex-1">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            name="cpf"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => onCpfChange(e.target.value)}
          />
        </div>
        <div className="grid gap-2 flex-1">
          <Label htmlFor="cns">CNS</Label>
          <Input
            id="cns"
            name="cns"
            inputMode="numeric"
            value={cns}
            onChange={(e) => onCnsChange(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onBuscarEsus}
          disabled={buscando || (!cpf && !cns)}
        >
          <Search className="w-4 h-4 mr-2" />
          {buscando ? "Buscando..." : "Buscar / Continuar"}
        </Button>
      </div>

      {mensagemBusca && (
        <p
          className={`text-sm font-medium ${
            mensagemBusca.tipo === "erro"
              ? "text-destructive"
              : mensagemBusca.tipo === "sucesso"
                ? "text-sky-600"
                : "text-muted-foreground"
          }`}
        >
          {mensagemBusca.texto}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="nome">Nome completo</Label>
        <Input
          id="nome"
          name="nome"
          required
          minLength={3}
          maxLength={120}
          value={nome}
          onChange={(e) => onNomeChange(e.target.value)}
          className={destaqueGeral}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="dtnasc">Data de nascimento</Label>
          <Input
            id="dtnasc"
            name="dtnasc"
            type="date"
            required
            value={dtnasc}
            onChange={(e) => onDtnascChange(e.target.value)}
            className={destaqueGeral}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sexo">Sexo</Label>
          <select
            id="sexo"
            name="sexo"
            required
            value={sexo}
            onChange={(e) =>
              onSexoChange(e.target.value as "MASCULINO" | "FEMININO" | "OUTRO")
            }
            className={`border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm ${destaqueGeral}`}
          >
            <option value="MASCULINO">Masculino</option>
            <option value="FEMININO">Feminino</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="municipioOrigem">Município de origem</Label>
        <Input
          id="municipioOrigem"
          name="municipioOrigem"
          required
          minLength={2}
          maxLength={120}
          placeholder="Ex.: Recife"
          value={municipioOrigem}
          onChange={(e) => onMunicipioOrigemChange(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="endereco">Endereço (opcional)</Label>
        <Input
          id="endereco"
          name="endereco"
          autoComplete="street-address"
          value={endereco}
          onChange={(e) => onEnderecoChange(e.target.value)}
          className={destaqueGeral}
        />
      </div>
    </div>
  );
}
