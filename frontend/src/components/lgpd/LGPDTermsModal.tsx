import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/** Versão corrente dos termos — deve espelhar `CURRENT_TERM_VERSION` no backend. */
export const LGPD_TERM_VERSION = '1.0'

/**
 * Modal somente-leitura com o texto dos termos de uso de dados pessoais
 * apresentados no cadastro de aluno (base legal: matrícula e gestão escolar).
 */
export function LGPDTermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lgpd-terms-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 rounded-lg border border-line bg-white p-6 shadow-overlay"
      >
        <div className="flex items-start justify-between">
          <h2 id="lgpd-terms-title" className="text-section text-ink-900">
            Termos de Uso de Dados Pessoais — Versão {LGPD_TERM_VERSION}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4 text-ink-400" />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto pr-2 text-base text-ink-700">
          <section>
            <h3 className="text-label text-ink-900">1. Objeto do consentimento</h3>
            <p className="mt-1 text-help text-ink-500">
              Este termo estabelece as condições para o tratamento de dados pessoais do
              aluno pela Secretaria Municipal de Educação e pelas unidades escolares da
              rede municipal, nos termos da Lei 13.709/2018 (Lei Geral de Proteção de
              Dados — LGPD).
            </p>
          </section>

          <section>
            <h3 className="text-label text-ink-900">2. Dados coletados</h3>
            <p className="mt-1 text-help text-ink-500">
              Dados de identificação (nome, CPF, RG, data de nascimento), filiação,
              endereço, contatos dos responsáveis, dados acadêmicos (notas, frequência,
              histórico escolar), dados de saúde estritamente necessários ao atendimento
              educacional especializado e documentos oficiais.
            </p>
          </section>

          <section>
            <h3 className="text-label text-ink-900">3. Finalidades do tratamento</h3>
            <ul className="mt-1 list-disc pl-5 text-help text-ink-500">
              <li>Efetuar a matrícula e manter o registro escolar</li>
              <li>Gestão acadêmica e acompanhamento pedagógico</li>
              <li>Emissão de documentos escolares (boletim, histórico, declarações)</li>
              <li>Cumprimento de obrigações legais (Censo Escolar / Educacenso)</li>
              <li>Comunicação com os responsáveis sobre assuntos escolares</li>
              <li>Garantia dos direitos educacionais e sociais do aluno</li>
            </ul>
          </section>

          <section>
            <h3 className="text-label text-ink-900">4. Compartilhamento de dados</h3>
            <p className="mt-1 text-help text-ink-500">
              Os dados poderão ser compartilhados com o MEC/INEP para fins de Censo
              Escolar, com órgãos de controle (Ministério Público, Tribunal de Contas)
              quando exigido por lei e com prestadores de serviço sob contrato de
              confidencialidade.
            </p>
          </section>

          <section>
            <h3 className="text-label text-ink-900">5. Direitos do titular</h3>
            <p className="mt-1 text-help text-ink-500">
              O responsável legal e o aluno (quando maior de idade) podem confirmar a
              existência de tratamento, acessar e corrigir os dados, solicitar
              portabilidade ou eliminação (exceto dados de guarda obrigatória) e revogar
              o consentimento — hipótese que pode inviabilizar a continuidade da
              matrícula.
            </p>
          </section>

          <section>
            <h3 className="text-label text-ink-900">6. Armazenamento e segurança</h3>
            <p className="mt-1 text-help text-ink-500">
              Os dados são armazenados em sistema informatizado com medidas técnicas e
              administrativas de segurança, pelo prazo necessário ao cumprimento das
              finalidades educacionais e das obrigações legais de guarda.
            </p>
          </section>

          <section>
            <h3 className="text-label text-ink-900">7. Encarregado de dados (DPO)</h3>
            <p className="mt-1 text-help text-ink-500">
              Para exercer seus direitos ou esclarecer dúvidas, o responsável legal pode
              contatar o Encarregado de Proteção de Dados da Secretaria Municipal de
              Educação.
            </p>
          </section>

          <section>
            <h3 className="text-label text-ink-900">8. Consentimento</h3>
            <p className="mt-1 text-help text-ink-500">
              Ao aceitar estes termos, o responsável legal consente, de forma livre e
              informada, com o tratamento dos dados pessoais do aluno nos termos aqui
              descritos, ciente de que a recusa pode impossibilitar a matrícula e o
              acompanhamento escolar.
            </p>
          </section>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
