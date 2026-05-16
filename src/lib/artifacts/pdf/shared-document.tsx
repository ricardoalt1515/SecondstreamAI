import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { h2oBrand } from "./brand-tokens";

const styles = StyleSheet.create({
  logoMark: {
    alignItems: "center",
    backgroundColor: h2oBrand.colors.navy,
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  logoText: {
    color: h2oBrand.colors.white,
    fontFamily: h2oBrand.font.bold,
    fontSize: 8,
  },
  eyebrow: {
    color: h2oBrand.colors.blue,
    fontFamily: h2oBrand.font.bold,
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  cover: {
    backgroundColor: h2oBrand.colors.panelBlue,
    borderColor: h2oBrand.colors.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 22,
    padding: 22,
  },
  coverBrand: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    gap: 10,
  },
  title: {
    color: h2oBrand.colors.navy,
    fontFamily: h2oBrand.font.bold,
    fontSize: 30,
    lineHeight: 1.08,
  },
  metadata: {
    color: h2oBrand.colors.muted,
    fontSize: 10,
    lineHeight: 1.4,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: h2oBrand.colors.navy,
    borderRadius: 999,
    color: h2oBrand.colors.white,
    fontFamily: h2oBrand.font.bold,
    fontSize: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sectionHeader: {
    borderBottomColor: h2oBrand.colors.line,
    borderBottomWidth: 1,
    color: h2oBrand.colors.navy,
    fontFamily: h2oBrand.font.bold,
    fontSize: 17,
    marginBottom: 10,
    paddingBottom: 5,
  },
  insight: {
    backgroundColor: h2oBrand.colors.panel,
    borderColor: h2oBrand.colors.cyan,
    borderLeftWidth: 4,
    borderRadius: 8,
    color: h2oBrand.colors.ink,
    fontSize: 10,
    lineHeight: 1.45,
    marginBottom: 10,
    padding: 10,
  },
  footer: {
    bottom: 22,
    color: h2oBrand.colors.muted,
    fontSize: 8,
    left: h2oBrand.page.paddingX,
    position: "absolute",
    right: h2oBrand.page.paddingX,
  },
});

export const LogoMark = () => (
  <View style={styles.logoMark}>
    <Text style={styles.logoText}>H2O</Text>
  </View>
);

export const StageBadge = ({ stage }: { stage: string }) => (
  <Text style={styles.badge}>Stage: {stage}</Text>
);

export const CoverBlock = ({
  artifactLabel,
  customerName,
  date,
  location,
  stage,
}: {
  artifactLabel: string;
  customerName: string;
  date?: string;
  location?: string;
  stage: string;
}) => (
  <View style={styles.cover}>
    <View style={styles.coverBrand}>
      <LogoMark />
      <Text style={styles.eyebrow}>{artifactLabel}</Text>
    </View>
    <Text style={styles.title}>{customerName}</Text>
    <StageBadge stage={stage} />
    <Text style={styles.metadata}>
      {[location, date].filter(Boolean).join(" • ") || "Prepared for qualification review"}
    </Text>
  </View>
);

export const SectionHeader = ({ children }: { children: ReactNode }) => (
  <Text style={styles.sectionHeader}>{children}</Text>
);

export const InsightBox = ({ children }: { children: ReactNode }) => (
  <Text style={styles.insight}>{children}</Text>
);

export const Footer = ({ label }: { label: string }) => (
  <Text
    fixed
    render={({ pageNumber, totalPages }) => `${label} · ${pageNumber} / ${totalPages}`}
    style={styles.footer}
  />
);
