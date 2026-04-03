import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { BankData, InsuranceData, ChargeRow } from './proposta-editor';
import { formatDate } from '@/lib/utils';

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 36,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  officeName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerLabel: {
    color: '#6b7280',
    fontSize: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 6,
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  tableRowHighlight: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fefce8',
  },
  cellLabel: {
    padding: '5 6',
    fontWeight: 700,
    color: '#374151',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  cellHeader: {
    padding: '5 6',
    fontWeight: 700,
    color: '#374151',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    textAlign: 'center',
  },
  cell: {
    padding: '5 6',
    color: '#4b5563',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    textAlign: 'center',
  },
  cellLast: {
    padding: '5 6',
    color: '#4b5563',
    textAlign: 'center',
  },
  highlightStar: {
    color: '#ca8a04',
    marginRight: 3,
  },
  notesBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  notesText: {
    color: '#4b5563',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
  },
  totalCell: {
    padding: '5 6',
    fontWeight: 700,
    color: '#111827',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    textAlign: 'center',
  },
  totalCellLast: {
    padding: '5 6',
    fontWeight: 700,
    color: '#111827',
    textAlign: 'center',
  },
});

interface PropostaPDFProps {
  clientName: string;
  officeName: string;
  title: string;
  banks: BankData[];
  insurance: InsuranceData;
  oneTimeCharges: ChargeRow[];
  monthlyCharges: ChargeRow[];
  notes: string;
  createdAt: string;
}

function calcInsuranceSubtotal(bankName: string, insurance: InsuranceData, type: 'bank' | 'external') {
  const ins = insurance[bankName];
  if (!ins) return '—';
  const vida = parseFloat(type === 'bank' ? ins.vida : ins.vida_ext) || 0;
  const multi = parseFloat(type === 'bank' ? ins.multirriscos : ins.multirriscos_ext) || 0;
  if (vida === 0 && multi === 0) return '—';
  return (vida + multi).toFixed(2);
}

function calcChargeTotal(charges: ChargeRow[], bankName: string) {
  let total = 0;
  let hasValue = false;
  for (const row of charges) {
    const val = parseFloat(row[bankName] as string);
    if (!isNaN(val)) {
      total += val;
      hasValue = true;
    }
  }
  return hasValue ? total.toFixed(2) : '—';
}

export function PropostaPDF({
  clientName,
  officeName,
  title,
  banks,
  insurance,
  oneTimeCharges,
  monthlyCharges,
  notes,
  createdAt,
}: PropostaPDFProps) {
  const labelWidth = 130;
  const colWidth = banks.length > 0 ? Math.floor((595 - 72 - labelWidth) / banks.length) : 100;

  const comparisonFields: { key: keyof BankData; label: string }[] = [
    { key: 'montante', label: 'Montante (€)' },
    { key: 'prazo', label: 'Prazo (meses)' },
    { key: 'tipo_taxa', label: 'Tipo de Taxa' },
    { key: 'euribor', label: 'Euribor (%)' },
    { key: 'spread', label: 'Spread (%)' },
    { key: 'tan', label: 'TAN (%)' },
    { key: 'prestacao', label: 'Prestação (€)' },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.officeName}>{officeName || 'HomeFlux'}</Text>
            {title ? <Text style={{ marginTop: 4, fontSize: 11, color: '#374151' }}>{title}</Text> : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>Cliente</Text>
            <Text style={{ fontWeight: 700, color: '#111827' }}>{clientName}</Text>
            <Text style={{ ...styles.headerLabel, marginTop: 6 }}>Data</Text>
            <Text style={{ color: '#374151' }}>{formatDate(createdAt)}</Text>
          </View>
        </View>

        {/* Bank Comparison */}
        {banks.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Comparação de Bancos</Text>
            <View style={styles.table}>
              {/* Header row */}
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.cellLabel, width: labelWidth }}>Campo</Text>
                {banks.map((bank, i) => (
                  <Text
                    key={i}
                    style={{
                      ...styles.cellHeader,
                      width: colWidth,
                      ...(i === banks.length - 1 ? { borderRightWidth: 0 } : {}),
                      ...(bank.highlight ? { backgroundColor: '#fef9c3' } : {}),
                    }}
                  >
                    {bank.highlight ? '★ ' : ''}{bank.name}
                  </Text>
                ))}
              </View>
              {/* Data rows */}
              {comparisonFields.map((field, fi) => (
                <View
                  key={field.key}
                  style={fi === comparisonFields.length - 1 ? styles.tableRowLast : styles.tableRow}
                >
                  <Text style={{ ...styles.cellLabel, width: labelWidth }}>{field.label}</Text>
                  {banks.map((bank, i) => (
                    <Text
                      key={i}
                      style={{
                        ...(i === banks.length - 1 ? styles.cellLast : styles.cell),
                        width: colWidth,
                        ...(bank.highlight ? { backgroundColor: '#fefce8' } : {}),
                      }}
                    >
                      {(bank[field.key] as string) || '—'}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Insurance */}
        {banks.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Seguros</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.cellLabel, width: labelWidth }}>Seguro</Text>
                {banks.map((bank, i) => (
                  <Text
                    key={i}
                    style={{
                      ...styles.cellHeader,
                      width: colWidth,
                      ...(i === banks.length - 1 ? { borderRightWidth: 0 } : {}),
                    }}
                  >
                    {bank.name}
                  </Text>
                ))}
              </View>
              {[
                { label: 'Seguro Banco - Vida (€)', field: 'vida' as const, type: 'bank' as const },
                { label: 'Seguro Banco - Multirriscos (€)', field: 'multirriscos' as const, type: 'bank' as const },
                { label: 'DS Seguros - Vida (€)', field: 'vida_ext' as const, type: 'external' as const },
                { label: 'DS Seguros - Multirriscos (€)', field: 'multirriscos_ext' as const, type: 'external' as const },
              ].map(({ label, field }) => (
                <View key={field} style={styles.tableRow}>
                  <Text style={{ ...styles.cellLabel, width: labelWidth }}>{label}</Text>
                  {banks.map((bank, i) => {
                    const val = insurance[bank.name]?.[field] || '—';
                    return (
                      <Text
                        key={i}
                        style={{
                          ...(i === banks.length - 1 ? styles.cellLast : styles.cell),
                          width: colWidth,
                        }}
                      >
                        {val}
                      </Text>
                    );
                  })}
                </View>
              ))}
              {/* Subtotal bank */}
              <View style={styles.tableRow}>
                <Text style={{ ...styles.cellLabel, width: labelWidth, fontWeight: 700 }}>Subtotal Banco</Text>
                {banks.map((bank, i) => (
                  <Text
                    key={i}
                    style={{
                      ...(i === banks.length - 1 ? styles.totalCellLast : styles.totalCell),
                      width: colWidth,
                    }}
                  >
                    {calcInsuranceSubtotal(bank.name, insurance, 'bank')}
                  </Text>
                ))}
              </View>
              {/* Subtotal external */}
              <View style={styles.tableRowLast}>
                <Text style={{ ...styles.cellLabel, width: labelWidth, fontWeight: 700 }}>Subtotal DS Seguros</Text>
                {banks.map((bank, i) => (
                  <Text
                    key={i}
                    style={{
                      ...(i === banks.length - 1 ? styles.totalCellLast : styles.totalCell),
                      width: colWidth,
                    }}
                  >
                    {calcInsuranceSubtotal(bank.name, insurance, 'external')}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* One-time Charges */}
        {oneTimeCharges.length > 0 && banks.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Encargos Pontuais</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.cellLabel, width: labelWidth }}>Encargo</Text>
                {banks.map((bank, i) => (
                  <Text
                    key={i}
                    style={{
                      ...styles.cellHeader,
                      width: colWidth,
                      ...(i === banks.length - 1 ? { borderRightWidth: 0 } : {}),
                    }}
                  >
                    {bank.name}
                  </Text>
                ))}
              </View>
              {oneTimeCharges.map((row, ri) => (
                <View key={ri} style={ri === oneTimeCharges.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={{ ...styles.cellLabel, width: labelWidth }}>{row.label}</Text>
                  {banks.map((bank, i) => (
                    <Text
                      key={i}
                      style={{
                        ...(i === banks.length - 1 ? styles.cellLast : styles.cell),
                        width: colWidth,
                      }}
                    >
                      {(row[bank.name] as string) || '—'}
                    </Text>
                  ))}
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={{ ...styles.cellLabel, width: labelWidth, fontWeight: 700 }}>Total</Text>
                {banks.map((bank, i) => (
                  <Text
                    key={i}
                    style={{
                      ...(i === banks.length - 1 ? styles.totalCellLast : styles.totalCell),
                      width: colWidth,
                    }}
                  >
                    {calcChargeTotal(oneTimeCharges, bank.name)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Monthly Charges */}
        {monthlyCharges.length > 0 && banks.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Encargos Mensais</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ ...styles.cellLabel, width: labelWidth }}>Encargo</Text>
                {banks.map((bank, i) => (
                  <Text
                    key={i}
                    style={{
                      ...styles.cellHeader,
                      width: colWidth,
                      ...(i === banks.length - 1 ? { borderRightWidth: 0 } : {}),
                    }}
                  >
                    {bank.name}
                  </Text>
                ))}
              </View>
              {monthlyCharges.map((row, ri) => (
                <View key={ri} style={ri === monthlyCharges.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={{ ...styles.cellLabel, width: labelWidth }}>{row.label}</Text>
                  {banks.map((bank, i) => (
                    <Text
                      key={i}
                      style={{
                        ...(i === banks.length - 1 ? styles.cellLast : styles.cell),
                        width: colWidth,
                      }}
                    >
                      {(row[bank.name] as string) || '—'}
                    </Text>
                  ))}
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={{ ...styles.cellLabel, width: labelWidth, fontWeight: 700 }}>Total Mensal</Text>
                {banks.map((bank, i) => (
                  <Text
                    key={i}
                    style={{
                      ...(i === banks.length - 1 ? styles.totalCellLast : styles.totalCell),
                      width: colWidth,
                    }}
                  >
                    {calcChargeTotal(monthlyCharges, bank.name)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {notes && (
          <View>
            <Text style={styles.sectionTitle}>Notas</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>{officeName || 'HomeFlux'} — Proposta de Crédito Habitação</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
