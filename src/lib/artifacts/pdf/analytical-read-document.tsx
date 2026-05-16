import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { AnalyticalReadPayload } from "../payloads";
import { artifactLabels, h2oBrand } from "./brand-tokens";
import { CoverBlock, Footer, InsightBox, SectionHeader } from "./shared-document";

const styles = StyleSheet.create({
  page: {
    color: h2oBrand.colors.ink,
    fontFamily: h2oBrand.font.family,
    fontSize: 10,
    lineHeight: 1.5,
    paddingBottom: 52,
    paddingHorizontal: h2oBrand.page.paddingX,
    paddingTop: h2oBrand.page.paddingY,
  },
  section: {
    marginBottom: 16,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  tagRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 8,
    marginTop: 4,
  },
  tag: {
    backgroundColor: h2oBrand.colors.panelBlue,
    borderRadius: 4,
    color: h2oBrand.colors.navy,
    fontFamily: h2oBrand.font.bold,
    fontSize: 7.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textTransform: "uppercase",
  },
  table: {
    borderColor: h2oBrand.colors.line,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    overflow: "hidden",
  },
  tableRow: {
    borderTopColor: h2oBrand.colors.line,
    borderTopWidth: 0.5,
    display: "flex",
    flexDirection: "row",
  },
  tableHeaderRow: {
    backgroundColor: h2oBrand.colors.navy,
    borderTopWidth: 0,
  },
  tableHeaderCell: {
    color: h2oBrand.colors.white,
    fontFamily: h2oBrand.font.bold,
  },
  tableCell: {
    borderRightColor: h2oBrand.colors.line,
    borderRightWidth: 0.5,
    flex: 1,
    fontSize: 8.5,
    padding: 6,
  },
});

const collectTableHeaders = (rows: Array<Record<string, string>>): string[] => {
  const seen = new Map<string, true>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.set(key, true);
      }
    }
  }
  return Array.from(seen.keys());
};

const SectionTable = ({ rows }: { rows: Array<Record<string, string>> }) => {
  const headers = collectTableHeaders(rows);
  if (!headers.length) {
    return null;
  }
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeaderRow]}>
        {headers.map((header, index) => (
          <Text
            key={header}
            style={[
              styles.tableCell,
              styles.tableHeaderCell,
              index === headers.length - 1 ? { borderRightWidth: 0 } : {},
            ]}
          >
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}-${headers.map((h) => row[h] ?? "").join("|")}`}
          style={styles.tableRow}
        >
          {headers.map((header, colIndex) => (
            <Text
              key={header}
              style={[
                styles.tableCell,
                colIndex === headers.length - 1 ? { borderRightWidth: 0 } : {},
              ]}
            >
              {row[header] ?? ""}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
};

export const AnalyticalReadDocument = ({ payload }: { payload: AnalyticalReadPayload }) => (
  <Document
    author="SecondstreamAI"
    subject="H2O Allegiant Analytical Read"
    title={`${payload.customer.name} Analytical Read`}
  >
    <Page size={h2oBrand.page.size} style={styles.page}>
      <CoverBlock
        artifactLabel={artifactLabels.analyticalRead}
        customerName={payload.title ?? `${payload.customer.name} Analytical Read`}
        location={payload.customer.location}
        stage="Record"
      />
      <View style={styles.section}>
        <SectionHeader>Summary</SectionHeader>
        <InsightBox>{payload.summary}</InsightBox>
      </View>
      {payload.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <SectionHeader>{section.heading}</SectionHeader>
          <Text style={styles.body}>{section.body}</Text>
          {section.evidenceTags?.length ? (
            <View style={styles.tagRow}>
              {section.evidenceTags.map((tag) => (
                <Text key={tag} style={styles.tag}>
                  {tag}
                </Text>
              ))}
            </View>
          ) : null}
          {section.table?.length ? <SectionTable rows={section.table} /> : null}
        </View>
      ))}
      <Footer label="H2O Allegiant Analytical Read" />
    </Page>
  </Document>
);

export const renderAnalyticalReadPdf = async (payload: AnalyticalReadPayload): Promise<Buffer> =>
  renderToBuffer(<AnalyticalReadDocument payload={payload} />);
