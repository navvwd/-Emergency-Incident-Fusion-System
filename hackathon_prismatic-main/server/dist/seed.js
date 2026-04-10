"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const reports = [
    {
        "report_type": "text",
        "text_content": "அண்ணா நகர் சிக்னலில் பைக் விபத்து, 2 பேர் காயம்",
        "expected_incident_type": "road_accident",
        "language": "ta-IN"
    },
    {
        "report_type": "text",
        "text_content": "Anna Nagar signal pe bike accident hua, do log injured",
        "expected_incident_type": "road_accident",
        "language": "hi-IN",
        "should_dedup_with": "report_1"
    },
    {
        "report_type": "text",
        "text_content": "T. Nagar లో భారీ అగ్నిప్రమాదం, 3 అంతస్తుల భవనం తగలబడింది",
        "expected_incident_type": "fire",
        "language": "te-IN"
    },
    {
        "report_type": "text",
        "text_content": "Heavy flooding near Adyar river, water entered 50+ houses",
        "expected_incident_type": "flood",
        "language": "en-IN"
    },
    {
        "report_type": "text",
        "text_content": "Tambaram स्टेशन के पास पुल गिरा, कई लोग फंसे",
        "expected_incident_type": "building_collapse",
        "language": "hi-IN"
    },
    {
        "report_type": "text",
        "text_content": "அடையாறு நதியில் வெள்ளம், 50 வீடுகளுக்குள் தண்ணீர்",
        "expected_incident_type": "flood",
        "language": "ta-IN",
        "should_dedup_with": "report_4"
    },
    {
        "report_type": "text",
        "text_content": "Gas leak at Manali industrial area, workers evacuated",
        "expected_incident_type": "infrastructure",
        "language": "en-IN"
    },
    {
        "report_type": "text",
        "text_content": "மணலி தொழிற்சாலை பகுதியில் எரிவாயு கசிவு, தொழிலாளர்கள் வெளியேற்றம்",
        "expected_incident_type": "infrastructure",
        "language": "ta-IN",
        "should_dedup_with": "report_7"
    }
];
async function seedData() {
    console.log("🚀 Starting EIFS initial data seed...");
    console.log("Sending items sequentially to ensure deduplication ordering...\n");
    for (let i = 0; i < reports.length; i++) {
        const report = reports[i];
        console.log(`[${i + 1}/${reports.length}] Seding report in ${report.language}...`);
        console.log(`Content: "${report.text_content}"`);
        const formData = new form_data_1.default();
        formData.append('report_type', report.report_type);
        formData.append('text_content', report.text_content);
        if (report.language) {
            formData.append('language', report.language);
        }
        try {
            const response = await axios_1.default.post('http://localhost:3001/api/ingest-report', formData, {
                headers: formData.getHeaders(),
            });
            console.log(`✅ Success! Incident ID: ${response.data.incident_id}`);
            if (response.data.is_merged) {
                console.log(`   --> MERGED with an existing incident! ` +
                    (report.should_dedup_with ? `(Expected deduplication successful)` : ``));
            }
            else {
                console.log(`   --> CREATED new incident.`);
            }
        }
        catch (error) {
            console.error(`❌ Failed to submit report: ${error.message}`);
            if (error.response) {
                console.error("DEBUG:", JSON.stringify(error.response.data, null, 2));
            }
        }
        console.log("--------------------------------------------------\n");
        // Wait slightly to ease rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log("🎉 Seeding complete!");
}
seedData();
//# sourceMappingURL=seed.js.map