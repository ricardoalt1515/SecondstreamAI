import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PlaybookPayload } from "../payloads";
import { artifactLabels, h2oBrand, themePalette } from "./brand-tokens";
import { CoverBlock, Footer } from "./shared-document";

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
  orientationCallout: {
    backgroundColor: h2oBrand.colors.panel,
    borderColor: h2oBrand.colors.line,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 10,
    fontStyle: "italic",
    lineHeight: 1.5,
    marginBottom: 18,
    padding: 12,
  },
  themeBlock: {
    marginBottom: 18,
  },
  themeHeader: {
    borderBottomWidth: 1.4,
    display: "flex",
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    paddingBottom: 5,
  },
  themeNumber: {
    fontFamily: h2oBrand.font.bold,
    fontSize: 18,
    width: 26,
  },
  themeTitleColumn: {
    flex: 1,
  },
  themeTitle: {
    color: h2oBrand.colors.navy,
    fontFamily: h2oBrand.font.bold,
    fontSize: 13,
    lineHeight: 1.2,
  },
  themeFraming: {
    color: h2oBrand.colors.muted,
    fontSize: 9,
    fontStyle: "italic",
    marginTop: 2,
  },
  substreamChip: {
    alignSelf: "flex-start",
    backgroundColor: h2oBrand.colors.panelBlue,
    borderRadius: 999,
    color: h2oBrand.colors.navy,
    fontFamily: h2oBrand.font.bold,
    fontSize: 7.5,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "uppercase",
  },
  question: {
    display: "flex",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  questionDot: {
    width: 10,
  },
  questionText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.45,
  },
});

const ThemeBlock = ({
  index,
  theme,
}: {
  index: number;
  theme: PlaybookPayload["themes"][number];
}) => {
  const accent = themePalette[index % themePalette.length];
  return (
    <View style={styles.themeBlock} wrap={false}>
      <View style={[styles.themeHeader, { borderBottomColor: accent }]}>
        <Text style={[styles.themeNumber, { color: accent }]}>{index + 1}</Text>
        <View style={styles.themeTitleColumn}>
          <Text style={styles.themeTitle}>{theme.title}</Text>
          {theme.framing ? <Text style={styles.themeFraming}>{theme.framing}</Text> : null}
        </View>
      </View>
      {theme.substreamTag ? (
        <Text style={styles.substreamChip}>Sub-stream: {theme.substreamTag}</Text>
      ) : null}
      {theme.questions.map((question) => (
        <View key={question} style={styles.question}>
          <Text style={[styles.questionDot, { color: accent }]}>•</Text>
          <Text style={styles.questionText}>{question}</Text>
        </View>
      ))}
    </View>
  );
};

export const PlaybookDocument = ({ payload }: { payload: PlaybookPayload }) => (
  <Document
    author="SecondstreamAI"
    subject="H2O Allegiant Conversation Playbook"
    title={`${payload.customer.name} Playbook`}
  >
    <Page size={h2oBrand.page.size} style={styles.page}>
      <CoverBlock
        artifactLabel={artifactLabels.playbook}
        customerName={payload.title ?? `${payload.customer.name} Conversation Playbook`}
        location={payload.customer.location}
        stage={payload.stage ?? "Reference"}
      />
      {payload.orientation ? (
        <Text style={styles.orientationCallout}>{payload.orientation}</Text>
      ) : null}
      {payload.themes.map((theme, index) => (
        <ThemeBlock key={theme.title} index={index} theme={theme} />
      ))}
      <Footer label="H2O Allegiant Conversation Playbook" />
    </Page>
  </Document>
);

export const renderPlaybookPdf = async (payload: PlaybookPayload): Promise<Buffer> =>
  renderToBuffer(<PlaybookDocument payload={payload} />);
