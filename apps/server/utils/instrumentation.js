import "dotenv/config";
import {NodeSDK} from "@opentelemetry/sdk-node";
import {getNodeAutoInstrumentations} from "@opentelemetry/auto-instrumentations-node";
import {OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-proto";
import {BatchSpanProcessor} from "@opentelemetry/sdk-trace-base";
import {resourceFromAttributes} from "@opentelemetry/resources";
import {SemanticResourceAttributes} from "@opentelemetry/semantic-conventions";

if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
    // Initialize OTLP trace exporter with the endpoint URL and headers
    // Initialize OTLP trace exporter with the endpoint URL and headers
    const traceExporter = new OTLPTraceExporter({
        url: "https://api.axiom.co/v1/traces",
        headers: {
            Authorization: `Bearer ${process.env.AXIOM_TOKEN}`,
            "X-Axiom-Dataset": process.env.AXIOM_DATASET,
        },
    });

    const resourceAttributes = {
        [SemanticResourceAttributes.SERVICE_NAME]: "node traces",
    };

    const resource = resourceFromAttributes(resourceAttributes);

    // Configuring the OpenTelemetry Node SDK
    const sdk = new NodeSDK({
        // Adding a BatchSpanProcessor to batch and send traces
        spanProcessor: new BatchSpanProcessor(traceExporter),

        // Registering the resource to the SDK
        resource: resource,

        // Adding auto-instrumentations to automatically collect trace data
        instrumentations: [getNodeAutoInstrumentations()],
    });

    console.log("✅成功加载 Axiom 遥测");
    // Starting the OpenTelemetry SDK to begin collecting telemetry data
    sdk.start();
} else {
    console.log("❌未设置 Axiom 遥测");
}
