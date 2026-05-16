import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { FieldBriefPayload } from "../payloads";
import { artifactLabels, h2oBrand } from "./brand-tokens";
import { CoverBlock, Footer, InsightBox, SectionHeader } from "./shared-document";

const styles = StyleSheet.create({
  page: {
    color: h2oBrand.colors.ink,
    fontFamily: h2oBrand.font.family,
    fontSize: 10,
    lineHeight: 1.45,
    paddingBottom: 52,
    paddingHorizontal: h2oBrand.page.paddingX,
    paddingTop: h2oBrand.page.paddingY,
  },
  section: {
    marginBottom: 18,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  subhead: {
    color: h2oBrand.colors.navy,
    fontFamily: h2oBrand.font.bold,
    fontSize: 11,
    marginBottom: 5,
    marginTop: 4,
  },
  bullet: {
    display: "flex",
    flexDirection: "row",
    gap: 6,
    marginBottom: 5,
  },
  bulletDot: {
    color: h2oBrand.colors.blue,
    width: 8,
  },
  bulletText: {
    flex: 1,
  },
  table: {
    borderColor: h2oBrand.colors.line,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 7,
    overflow: "hidden",
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: h2oBrand.colors.navy,
    color: h2oBrand.colors.white,
    fontFamily: h2oBrand.font.bold,
  },
  tableCell: {
    borderRightColor: h2oBrand.colors.line,
    borderRightWidth: 1,
    flex: 1,
    fontSize: 8.5,
    padding: 7,
  },
  totalCell: {
    backgroundColor: h2oBrand.colors.panelBlue,
    fontFamily: h2oBrand.font.bold,
  },
  riskCard: {
    borderColor: h2oBrand.colors.line,
    borderLeftColor: h2oBrand.colors.amber,
    borderLeftWidth: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10,
  },
  actionCard: {
    backgroundColor: h2oBrand.colors.panel,
    borderColor: h2oBrand.colors.line,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10,
  },
  cardTitle: {
    color: h2oBrand.colors.navy,
    fontFamily: h2oBrand.font.bold,
    fontSize: 11,
    marginBottom: 4,
  },
  timeframe: {
    color: h2oBrand.colors.green,
    fontFamily: h2oBrand.font.bold,
    fontSize: 8.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  stopFlag: {
    borderColor: h2oBrand.colors.red,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    padding: 8,
  },
  muted: {
    color: h2oBrand.colors.muted,
  },
});

const Bullet = ({ lead, body }: { lead: string; body: string }) => (
  <View style={styles.bullet}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>
      <Text style={{ fontFamily: h2oBrand.font.bold }}>{lead}: </Text>
      {body}
    </Text>
  </View>
);

const CostTable = ({
  rows,
}: {
  rows: FieldBriefPayload["sections"]["whatWeWouldPropose"]["costOfAlternativeRows"];
}) => (
  <View style={styles.table}>
    <View style={[styles.tableRow, styles.tableHeader]}>
      <Text style={styles.tableCell}>Component</Text>
      <Text style={styles.tableCell}>Their path</Text>
      <Text style={[styles.tableCell, { borderRightWidth: 0 }]}>Our proposal</Text>
    </View>
    {rows.map((row) => (
      <View key={`${row.component}-${row.theirPath}`} style={styles.tableRow}>
        <Text style={row.isTotal ? [styles.tableCell, styles.totalCell] : styles.tableCell}>
          {row.component}
        </Text>
        <Text style={row.isTotal ? [styles.tableCell, styles.totalCell] : styles.tableCell}>
          {row.theirPath}
        </Text>
        <Text
          style={
            row.isTotal
              ? [styles.tableCell, { borderRightWidth: 0 }, styles.totalCell]
              : [styles.tableCell, { borderRightWidth: 0 }]
          }
        >
          {row.ourProposal}
        </Text>
      </View>
    ))}
  </View>
);

const StopFlags = ({ flags }: { flags: NonNullable<FieldBriefPayload["stopFlags"]> }) => {
  if (!flags.length) {
    return null;
  }
  return (
    <View style={styles.section}>
      <SectionHeader>Stop flags</SectionHeader>
      {flags.map((flag) => (
        <View key={flag.title} style={styles.stopFlag} wrap={false}>
          <Text style={styles.cardTitle}>{flag.title}</Text>
          <Text>{flag.summary}</Text>
        </View>
      ))}
    </View>
  );
};

export const FieldBriefDocument = ({ payload }: { payload: FieldBriefPayload }) => {
  const proposal = payload.sections.whatWeWouldPropose;
  const risks = payload.sections.whatCouldKillIt.risks;
  const actions = payload.sections.doThisNext.actions;

  return (
    <Document
      author="SecondstreamAI"
      subject="H2O Allegiant Field Brief"
      title={`${payload.customer.name} Field Brief`}
    >
      <Page size={h2oBrand.page.size} style={styles.page}>
        <CoverBlock
          artifactLabel={artifactLabels.fieldBrief}
          customerName={`${payload.customer.name} Field Brief`}
          date={payload.date}
          location={payload.customer.location}
          stage={payload.stage}
        />
        <StopFlags flags={payload.stopFlags ?? []} />

        <View style={styles.section}>
          <SectionHeader>What this is</SectionHeader>
          <InsightBox>{payload.sections.whatThisIs.insight}</InsightBox>
          <Text style={styles.body}>{payload.sections.whatThisIs.body}</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader>What we'd propose</SectionHeader>
          <InsightBox>{proposal.insight}</InsightBox>
          <Text style={styles.subhead}>Recommended approach</Text>
          <Text style={styles.body}>{proposal.recommendedApproach}</Text>
          <Text style={styles.subhead}>Why the customer should want this</Text>
          {proposal.winWinArguments.map((argument) => (
            <Bullet key={argument.lead} lead={argument.lead} body={argument.body} />
          ))}
          <Text style={styles.subhead}>Cost of the alternative</Text>
          <CostTable rows={proposal.costOfAlternativeRows} />
          {proposal.dealSizeSensitivity ? (
            <Text style={[styles.body, styles.muted]}>
              Sensitivity: {proposal.dealSizeSensitivity}
            </Text>
          ) : null}
        </View>
        <Footer label="H2O Allegiant Field Brief" />
      </Page>

      <Page size={h2oBrand.page.size} style={styles.page}>
        <View style={styles.section}>
          <SectionHeader>What could kill it</SectionHeader>
          <InsightBox>{payload.sections.whatCouldKillIt.insight}</InsightBox>
          {risks.map((risk) => (
            <View key={risk.name} style={styles.riskCard} wrap={false}>
              <Text style={styles.cardTitle}>{risk.name}</Text>
              <Text style={styles.body}>{risk.mechanism}</Text>
              <Text>
                <Text style={{ fontFamily: h2oBrand.font.bold }}>Mitigation: </Text>
                {risk.mitigation}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader>Do this next</SectionHeader>
          <InsightBox>{payload.sections.doThisNext.insight}</InsightBox>
          {actions.map((action, index) => (
            <View key={action.title} style={styles.actionCard} wrap={false}>
              <Text style={styles.cardTitle}>
                {index + 1}. {action.title}
              </Text>
              <Text style={styles.timeframe}>{action.timeframe}</Text>
              <Text>{action.body}</Text>
            </View>
          ))}
        </View>
        <Footer label="H2O Allegiant Field Brief" />
      </Page>
    </Document>
  );
};

export const renderFieldBriefPdf = async (payload: FieldBriefPayload): Promise<Buffer> =>
  renderToBuffer(<FieldBriefDocument payload={payload} />);
