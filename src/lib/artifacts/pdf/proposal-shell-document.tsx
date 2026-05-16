import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ProposalShellPayload } from "../payloads";
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
  bullet: {
    display: "flex",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  bulletDot: {
    color: h2oBrand.colors.blue,
    width: 10,
  },
  bulletText: {
    flex: 1,
  },
  commitGrid: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  commitCard: {
    borderColor: h2oBrand.colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  commitCardTo: {
    borderLeftColor: h2oBrand.colors.green,
    borderLeftWidth: 4,
  },
  commitCardHold: {
    borderLeftColor: h2oBrand.colors.amber,
    borderLeftWidth: 4,
  },
  commitTitle: {
    color: h2oBrand.colors.navy,
    fontFamily: h2oBrand.font.bold,
    fontSize: 11,
    marginBottom: 5,
  },
});

const BulletList = ({ items }: { items: string[] }) => (
  <View>
    {items.map((item) => (
      <View key={item} style={styles.bullet}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

export const ProposalShellDocument = ({ payload }: { payload: ProposalShellPayload }) => {
  const commitTo = payload.commitments.commitTo ?? [];
  const doNotCommit = payload.commitments.doNotCommitYet ?? [];
  return (
    <Document
      author="SecondstreamAI"
      subject="H2O Allegiant Proposal Shell"
      title={`${payload.customer.name} Proposal Shell`}
    >
      <Page size={h2oBrand.page.size} style={styles.page}>
        <CoverBlock
          artifactLabel={artifactLabels.proposalShell}
          customerName={payload.title ?? `${payload.customer.name} Proposal Shell`}
          location={payload.customer.location}
          stage="Propose"
        />
        <View style={styles.section}>
          <SectionHeader>Executive summary</SectionHeader>
          <InsightBox>{payload.executiveSummary}</InsightBox>
        </View>
        <View style={styles.section}>
          <SectionHeader>Proposed scope</SectionHeader>
          <BulletList items={payload.proposedScope} />
        </View>
        <View style={styles.section}>
          <SectionHeader>Sizing and pricing</SectionHeader>
          <Text style={styles.body}>{payload.sizingAndPricing}</Text>
        </View>
        <View style={styles.section}>
          <SectionHeader>Schedule</SectionHeader>
          <Text style={styles.body}>{payload.schedule}</Text>
        </View>
        {commitTo.length || doNotCommit.length ? (
          <View style={styles.section} wrap={false}>
            <SectionHeader>Commitments</SectionHeader>
            <View style={styles.commitGrid}>
              {commitTo.length ? (
                <View style={[styles.commitCard, styles.commitCardTo]}>
                  <Text style={styles.commitTitle}>Commit to</Text>
                  <BulletList items={commitTo} />
                </View>
              ) : null}
              {doNotCommit.length ? (
                <View style={[styles.commitCard, styles.commitCardHold]}>
                  <Text style={styles.commitTitle}>Do not commit yet</Text>
                  <BulletList items={doNotCommit} />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
        {payload.fundingPathway ? (
          <View style={styles.section}>
            <SectionHeader>Funding pathway</SectionHeader>
            <Text style={styles.body}>{payload.fundingPathway}</Text>
          </View>
        ) : null}
        {payload.riskAllocation ? (
          <View style={styles.section}>
            <SectionHeader>Risk allocation</SectionHeader>
            <Text style={styles.body}>{payload.riskAllocation}</Text>
          </View>
        ) : null}
        <Footer label="H2O Allegiant Proposal Shell" />
      </Page>
    </Document>
  );
};

export const renderProposalShellPdf = async (payload: ProposalShellPayload): Promise<Buffer> =>
  renderToBuffer(<ProposalShellDocument payload={payload} />);
