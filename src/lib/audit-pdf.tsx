import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 140,
    color: "#64748b",
  },
  value: {
    flex: 1,
  },
  hash: {
    fontFamily: "Courier",
    fontSize: 8,
    wordBreak: "break-all",
    marginTop: 4,
  },
  tallyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingVertical: 2,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
  },
});

interface AuditData {
  electionId: string;
  name: string;
  status: string;
  closedAt: string | null;
  merkleRoot: string | null;
  totalEligibleVoters: number;
  totalOtpVerified: number;
  totalVotesCast: number;
  candidateTally: { id: string; name: string; votes: number }[];
  finalLedgerHash: string | null;
  generatedAt: string;
}

export function AuditPdfDocument({ audit }: { audit: AuditData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>QuorumOS Audit Report</Text>
        <Text style={styles.subtitle}>
          {audit.name} • Generated {new Date(audit.generatedAt).toLocaleString()}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Election Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Election ID</Text>
            <Text style={styles.value}>{audit.electionId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{audit.status}</Text>
          </View>
          {audit.closedAt && (
            <View style={styles.row}>
              <Text style={styles.label}>Closed at</Text>
              <Text style={styles.value}>
                {new Date(audit.closedAt).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vote Counts</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Eligible voters</Text>
            <Text style={styles.value}>{audit.totalEligibleVoters}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>OTP verified</Text>
            <Text style={styles.value}>{audit.totalOtpVerified}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Votes cast</Text>
            <Text style={styles.value}>{audit.totalVotesCast}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Candidate Tally</Text>
          {audit.candidateTally.map((c) => (
            <View key={c.id} style={styles.tallyRow}>
              <Text>{c.name}</Text>
              <Text>{c.votes}</Text>
            </View>
          ))}
        </View>

        {audit.merkleRoot && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Integrity</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Merkle root</Text>
              <Text style={[styles.value, styles.hash]}>{audit.merkleRoot}</Text>
            </View>
            {audit.finalLedgerHash && (
              <View style={styles.row}>
                <Text style={styles.label}>Final ledger hash</Text>
                <Text style={[styles.value, styles.hash]}>
                  {audit.finalLedgerHash}
                </Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.footer}>
          QuorumOS – Privacy-first digital election infrastructure. This report
          was generated automatically. Tamper-evident ledger • Email OTP •
          Identity-vote separation.
        </Text>
      </Page>
    </Document>
  );
}
