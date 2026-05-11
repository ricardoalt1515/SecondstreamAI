import type { ReportBundleRequest } from "@/lib/reporting/schemas";

const gateColor = (status: ReportBundleRequest["qualificationGate"]["status"]): string => {
  switch (status) {
    case "open":
      return "#166534";
    case "open-with-conditions":
      return "#92400e";
    case "closed":
      return "#991b1b";
  }
};

export const renderExecutiveReportHtml = (request: ReportBundleRequest): string => {
  const sectionsHtml = request.executiveReport.sections
    .map(
      (section, index) => `
<section>
  <h2>${index + 1}. ${section.title}</h2>
  <p><strong>${section.lead}</strong></p>
  <p>${section.body}</p>
  <p><small>Evidence: ${section.evidenceTags.join(", ")}</small></p>
</section>`,
    )
    .join("\n");

  const safetyHtml =
    request.safetyFlags.length > 0
      ? request.safetyFlags
          .map(
            (flag) =>
              `<li><strong>${flag.severity.toUpperCase()}</strong> — ${flag.title}: ${flag.details}</li>`,
          )
          .join("")
      : "<li>No safety flags raised.</li>";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Executive Discovery Report</title>
    <style>
      body { font-family: Helvetica, Arial, sans-serif; margin: 1in; color: #111827; }
      h1 { margin: 0 0 8px 0; font-size: 20px; }
      h2 { margin: 18px 0 6px 0; font-size: 16px; }
      p { font-size: 10pt; line-height: 1.45; margin: 6px 0; }
      .cover { margin-bottom: 14px; }
      .gate { font-weight: 700; color: ${gateColor(request.qualificationGate.status)}; }
      .snapshot { margin: 12px 0; padding: 8px; border: 1px solid #d1d5db; }
      .safety { margin: 12px 0; padding: 8px; border: 1px solid #d1d5db; }
      ul { margin: 0; padding-left: 18px; }
      small { color: #6b7280; }
    </style>
  </head>
  <body>
    <header class="cover">
      <h1>Executive Discovery Report</h1>
      <p>Customer: ${request.executiveReport.customerSlug}</p>
      <p>Stream: ${request.executiveReport.streamSlug}</p>
      <p>Date: ${request.executiveReport.reportDate}</p>
      <p class="gate">Qualification Gate: ${request.qualificationGate.status.toUpperCase()}</p>
    </header>
    <div class="snapshot">
      <p><strong>${request.snapshot.headline}</strong></p>
      <p>${request.snapshot.summary}</p>
      <p><em>${request.snapshot.nextAction}</em></p>
    </div>
    <div class="safety">
      <p><strong>Safety Flags</strong></p>
      <ul>${safetyHtml}</ul>
    </div>
    ${sectionsHtml}
  </body>
</html>`;
};
