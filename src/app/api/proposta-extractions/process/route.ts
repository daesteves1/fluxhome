/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/server';

export const maxDuration = 60;

const SYSTEM_PROMPT = `You extract structured data from Portuguese mortgage offer documents (FINE - Ficha de Informação Normalizada Europeia). Return ONLY valid JSON matching the schema. Never invent values — if a field isn't clearly in the document, return null. Use Portuguese decimal convention in the source but return numbers as JSON numbers (e.g. '216.888,85 EUR' → 216888.85).`;

const USER_PROMPT = `Extract the following fields from this FINE document and return ONLY valid JSON with no markdown, no explanation, no code fences.

Schema:
{
  "bank_name": string | null,

  "rate_type": "variavel" | "fixa" | "mista" | null,
  "euribor_index": 3 | 6 | 12 | null,
  "spread": number | null,
  "tan_fixa": number | null,
  "prazo_fixo_anos": number | null,
  "periodo_fixo_anos": number | null,
  "tan_periodo_fixo": number | null,
  "spread_pos_fixo": number | null,

  "loan_amount": number | null,
  "term_months": number | null,
  "valor_avaliacao": number | null,
  "monthly_payment": number | null,
  "tan": number | null,
  "taeg": number | null,
  "mtic": number | null,
  "validade_ate": string | null,

  "vida_p1_banco": number | null,
  "vida_p1_externa": number | null,
  "multiriscos_banco": number | null,
  "multiriscos_externa": number | null,

  "comissao_abertura": number | null,
  "comissao_formalizacao": number | null,
  "despesas_avaliacao": number | null,
  "comissao_avaliacao": number | null,
  "despesas_escritura": number | null,
  "imposto_selo": number | null,
  "registo_predial": number | null,
  "manutencao_conta": number | null,

  "condicoes_spread": string[],
  "condicoes_pos_fixo": string | null,

  "juros_totais": number | null,
  "cenario_stress_euribor": number | null,
  "cenario_stress_tan": number | null,
  "cenario_stress_prestacao": number | null,
  "cenario_stress_mtic": number | null,

  "confidence": {
    "bank_name": number,
    "rate_type": number,
    "euribor_index": number,
    "spread": number,
    "tan_fixa": number,
    "prazo_fixo_anos": number,
    "periodo_fixo_anos": number,
    "tan_periodo_fixo": number,
    "spread_pos_fixo": number,
    "loan_amount": number,
    "term_months": number,
    "valor_avaliacao": number,
    "monthly_payment": number,
    "tan": number,
    "taeg": number,
    "mtic": number,
    "validade_ate": number,
    "vida_p1_banco": number,
    "vida_p1_externa": number,
    "multiriscos_banco": number,
    "multiriscos_externa": number,
    "comissao_abertura": number,
    "comissao_formalizacao": number,
    "despesas_avaliacao": number,
    "comissao_avaliacao": number,
    "despesas_escritura": number,
    "imposto_selo": number,
    "registo_predial": number,
    "manutencao_conta": number,
    "condicoes_spread": number,
    "condicoes_pos_fixo": number,
    "juros_totais": number,
    "cenario_stress_euribor": number,
    "cenario_stress_tan": number,
    "cenario_stress_prestacao": number,
    "cenario_stress_mtic": number
  }
}

Field extraction rules:

RATE TYPE:
- rate_type "variavel": indexed to Euribor with a spread. Look for "Taxa Variável", "Euribor", "indexante"
- rate_type "fixa": fixed rate for the entire term. Look for "Taxa Fixa"
- rate_type "mista": fixed period followed by variable. Look for "Taxa Mista", "período fixo inicial"
- euribor_index: return the number 3, 6, or 12 (months) — not a string. Found near "Euribor a 3/6/12 meses"

VARIABLE RATE:
- spread: the "spread contratado" (with vendas associadas/benefícios), NOT the spread base. Often labelled "Spread contratado" or found in the TAER section
- tan: the TAN contratada for the initial period (Euribor + spread at time of offer)

FIXED RATE (fixa or mista initial period):
- tan_fixa: TAN for the fixed period (only for rate_type "fixa")
- prazo_fixo_anos: duration of the fixed rate in YEARS for "fixa" type (the full term)
- periodo_fixo_anos: duration of the fixed initial period in YEARS for "mista" type
- tan_periodo_fixo: TAN during the fixed period for "mista" type
- spread_pos_fixo: spread that applies AFTER the fixed period for "mista" type

LOAN:
- loan_amount: "Montante do empréstimo" / "Montante e moeda do empréstimo a conceder"
- term_months: loan duration always in MONTHS (e.g. "30 anos" → 360)
- valor_avaliacao: "Valor presumido do imóvel" / "Valor Estimado de Avaliação"
- monthly_payment: "Prestação inicial" / "Montante da prestação"
- tan: overall TAN contratada (for variable: initial rate = Euribor + spread; for fixed: the fixed TAN)
- taeg: TAEG contratada (reflecting all vendas associadas)
- mtic: "Montante Total Imputado ao Consumidor" / "Montante Total a Reembolsar (MTIC)"
- validade_ate: return as ISO date "YYYY-MM-DD" if clearly stated, otherwise null

INSURANCE (monthly amounts only):
- vida_p1_banco: life insurance monthly premium quoted by the bank for P1. Normalize to monthly (divide annual by 12)
- vida_p1_externa: estimated external life insurance premium if shown
- multiriscos_banco: multirisk home insurance monthly premium quoted by the bank. Normalize to monthly
- multiriscos_externa: estimated external multirisk premium if shown

ONE-TIME CHARGES (actual amounts in EUR, not rates):
- comissao_abertura: opening/processing fee ("comissão de abertura", "comissão de estudo")
- comissao_formalizacao: formalization fee
- despesas_avaliacao: valuation expenses
- comissao_avaliacao: valuation commission
- despesas_escritura: notary/deed expenses
- imposto_selo: stamp duty ("Imposto de Selo")
- registo_predial: land registry fee ("registo predial")

MONTHLY CHARGES:
- manutencao_conta: monthly account maintenance fee. Often quoted quarterly — divide by 3. Look for "Comissão de Manutenção", "Manutenção de conta"

CONDITIONS:
- condicoes_spread: array of conditions required to obtain the contracted spread (vendas associadas). E.g. ["Domiciliação de ordenado", "Seguro de vida banco", "Seguro multirriscos banco", "Cartão de crédito ativo"]
- condicoes_pos_fixo: text description of the post-fixed-period conditions for "mista" type (e.g. "Euribor 6 meses + 0.75%")

COST ANALYSIS:
- juros_totais: total interest paid over the full loan term, in EUR. Look for "Juros totais", "Total de juros", or compute from MTIC − capital − charges if explicitly shown
- cenario_stress_euribor: the stress-test Euribor rate (%), e.g. the "cenário stress" or "simulação adversa" rate. Look near "Simulação Stress" or "Cenário adverso"
- cenario_stress_tan: the stress-test TAN (%). Usually spread + cenario_stress_euribor
- cenario_stress_prestacao: the monthly payment under the stress scenario, in EUR
- cenario_stress_mtic: the MTIC under the stress scenario, in EUR

GENERAL RULES:
- Always extract CONTRATADA/CONTRATADO values (with vendas associadas), never base values
- Convert Portuguese decimal notation: "216.888,85" → 216888.85
- confidence values: 0.0 to 1.0 per field (1.0 = explicitly stated, 0.5 = inferred, 0.0 = not found)
- If a field genuinely isn't in the document, return null — never hallucinate`;

interface ExtractionResult {
  bank_name: string | null;
  rate_type: 'variavel' | 'fixa' | 'mista' | null;
  euribor_index: number | null;
  spread: number | null;
  tan_fixa: number | null;
  prazo_fixo_anos: number | null;
  periodo_fixo_anos: number | null;
  tan_periodo_fixo: number | null;
  spread_pos_fixo: number | null;
  loan_amount: number | null;
  term_months: number | null;
  valor_avaliacao: number | null;
  monthly_payment: number | null;
  tan: number | null;
  taeg: number | null;
  mtic: number | null;
  validade_ate: string | null;
  vida_p1_banco: number | null;
  vida_p1_externa: number | null;
  multiriscos_banco: number | null;
  multiriscos_externa: number | null;
  manutencao_conta: number | null;
  comissao_abertura: number | null;
  comissao_formalizacao: number | null;
  despesas_avaliacao: number | null;
  comissao_avaliacao: number | null;
  despesas_escritura: number | null;
  imposto_selo: number | null;
  registo_predial: number | null;
  condicoes_spread: string[];
  condicoes_pos_fixo: string | null;
  juros_totais: number | null;
  cenario_stress_euribor: number | null;
  cenario_stress_tan: number | null;
  cenario_stress_prestacao: number | null;
  cenario_stress_mtic: number | null;
  confidence: Record<string, number>;
}

export async function POST(request: NextRequest) {
  const serviceClient = createAdminClient();

  let extractionId: string | null = null;
  const startedAt = Date.now();

  try {
    // Supabase webhook sends the row as JSON body
    const body = await request.json() as { record?: Record<string, unknown>; type?: string };

    // Support both direct DB webhook payload and test payload
    const record = body.record ?? body as Record<string, unknown>;
    extractionId = record.id as string;

    if (!extractionId) {
      return NextResponse.json({ error: 'No extraction id in payload' }, { status: 400 });
    }

    // Fetch the full row
    const { data: extractionRaw, error: fetchError } = await (serviceClient as any)
      .from('proposta_extractions')
      .select('*')
      .eq('id', extractionId)
      .single();

    if (fetchError || !extractionRaw) {
      console.error('[process] Extraction not found:', extractionId);
      return NextResponse.json({ error: 'Extraction not found' }, { status: 404 });
    }

    const extraction = extractionRaw as {
      id: string;
      office_id: string;
      broker_id: string;
      process_id: string;
      pdf_path: string;
      status: string;
    };

    // Only process pending rows
    if (extraction.status !== 'pending') {
      return NextResponse.json({ skipped: true, status: extraction.status });
    }

    // Mark as processing
    await (serviceClient as any)
      .from('proposta_extractions')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', extractionId);

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('fine-pdfs')
      .download(extraction.pdf_path);

    if (downloadError || !fileData) {
      throw new Error(`Storage download failed: ${downloadError?.message ?? 'no data'}`);
    }

    const pdfBuffer = await fileData.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    // Call Claude Haiku 4.5
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            } as any,
            {
              type: 'text',
              text: USER_PROMPT,
            },
          ],
        },
      ],
    });

    const rawText = message.content[0]?.type === 'text' ? message.content[0].text : '';

    // Strip markdown fences if present
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned) as ExtractionResult;

    const { confidence, ...extractedData } = parsed;

    const durationMs = Date.now() - startedAt;
    const fieldCount = Object.values(extractedData).filter((v) => v !== null && !(Array.isArray(v) && v.length === 0)).length;

    // Update row to complete
    await (serviceClient as any)
      .from('proposta_extractions')
      .update({
        status: 'complete',
        extracted_data: extractedData,
        confidence_data: confidence,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', extractionId);

    // Audit log
    try {
      await (serviceClient as any).from('audit_log').insert({
        action: 'proposta_extraction_completed',
        target_type: 'proposta_extraction',
        target_id: extractionId,
        metadata: {
          process_id: extraction.process_id,
          duration_ms: durationMs,
          field_count: fieldCount,
        },
      });
    } catch (e) {
      console.warn('[process] audit log failed:', e);
    }

    return NextResponse.json({ ok: true, extraction_id: extractionId, field_count: fieldCount });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[process] Extraction failed:', errorMessage);

    if (extractionId) {
      try {
        await (serviceClient as any)
          .from('proposta_extractions')
          .update({
            status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', extractionId);
      } catch { /* ignore */ }

      try {
        await (serviceClient as any).from('audit_log').insert({
          action: 'proposta_extraction_failed',
          target_type: 'proposta_extraction',
          target_id: extractionId,
          metadata: { error_message: errorMessage },
        });
      } catch { /* ignore */ }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
