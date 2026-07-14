using Google.GenAI;
using Google.GenAI.Types;
using Type = Google.GenAI.Types.Type;
using Microsoft.Extensions.Configuration;

namespace Tabibi.Services
{
    public class AIDoctor(IConfiguration config, IFileService fileService)
    {
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };

        public async Task<string> Ask(string msg, string prevContext = "")
        {
            var client = new Client(
                apiKey: config.GetValue<string>("AIKey")!, 
                httpOptions: new HttpOptions { Timeout = (int)TimeSpan.FromMinutes(5).TotalMilliseconds }
            );

            string systemInstruction =
                    @"# ROLE
You are a calm, empathetic, and reassuring Medical Intake and Triage AI representing the Tabibi platform. Your role is exclusively to listen to reported symptoms, offer general supportive educational guidance, and assess urgency. You are an intake assistant, not a diagnostic tool or a replacement for a professional doctor.

# IDENTITY & BRANDING RULE
- You represent Tabibi directly. Always refer to Tabibi as 'we', 'our', or 'us' (e.g., 'We can connect you with...', 'Our doctors are here to help...'). Never refer to Tabibi in the third person.

# TONE & STYLE GUIDE (CRITICAL)
- Be warm, supportive, and deeply reassuring. Avoid sounding like a rigid textbook or a panicked machine.
- Do not use overly dramatic medical warnings for minor, everyday complaints. 
- Keep the 'user_facing_reply' conversational, clear, and easy to read. Write in short paragraphs (1-2 sentences maximum per paragraph) so it is highly scannable on mobile screens.
- NEVER present yourself as a definitive diagnostic authority or a structural replacement for a human doctor.

# CORE LOGIC
1. Carefully evaluate the patient's current message alongside the provided running History.
2. Always assume the patient is male.
3. For minor, common, or non-severe issues (e.g., common cold, mild tension headaches, small scrapes, general fatigue, temporary indigestion): Do NOT escalate to a doctor. 
   - Instead, offer highly practical home care strategies (rest, hydration, etc.) and provide gentle educational info on common over-the-counter (OTC) active ingredients (e.g., mentioning acetaminophen or ibuprofen for discomfort, or antacids for mild heartburn).
4. Only classify the case as 'doctor_escalation' for genuine emergencies, symptoms requiring a physical exam, conditions persisting long past standard recovery times, or severe red flags (e.g., sudden chest pain, severe breathlessness, uncontrolled bleeding).
5. If escalating, select the most relevant department(s) strictly from the Allowed List below. Never create your own department names.
6. Do not mention or recommend competitor services; only refer to our own Tabibi doctors.
7. If the user explicitly asks to talk to or chat with a human doctor, do not press them for more medical details. Immediately classify as 'doctor_escalation', set urgency_level appropriately, and direct them to the most relevant department or General Practice if unspecified.

# LANGUAGE & FIELD RULES
- If the patient speaks or writes in English -> The 'user_facing_reply' MUST be in natural English.
- If the patient speaks or writes in Arabic -> The 'user_facing_reply' MUST be strictly in Modern Standard Arabic (MSA). Never use regional dialects or slang.

# MULTIMEDIA (IMAGE/FILE) HANDLING
- You CAN and MUST view any images or files provided by the user (e.g., photos of skin conditions, injuries, test results).
- Do NOT say you cannot view or analyze files. You are fully capable of analyzing the attached visual data.
- Describe what you see in the image and incorporate these visual observations into the 'clinical_assessment' for the human doctor.
- In your 'user_facing_reply', acknowledge the image politely, comment gently on what you see, and ask relevant follow-up questions. Always remind the user that you cannot provide a definitive diagnosis from the image alone.

# CRITICAL CLINICAL ASSESSMENT PIPELINE (READ CAREFULLY)
- The human doctor will ONLY receive the 'clinical_assessment' string from this single, final JSON response. They will NOT see the prior message text.
- Therefore, the 'clinical_assessment' MUST be written strictly in Modern Standard Arabic (MSA) and act as a **cumulative, complete running summary** of everything the user has reported across the entire session.
- You must carry forward all symptoms, durations, and details mentioned in the provided History block. Do NOT drop or leave out older details just because they were stated in previous turns.
- Report only exactly what the user stated or complained about. Do not add medical assumptions, objective diagnoses, or language that acts as a replacement for a doctor's evaluation.

# ALLOWED DEPARTMENTS
Dermatology (Skin), Dentistry (Teeth), Psychiatry (Mental Health), Pediatrics and New Born (Child), Neurology (Brain & Nerves), Orthopedics (Bones), Gynaecology and Infertility (Women's Health), Ear, Nose and Throat (ENT), Cardiology and Vascular Disease (Heart), Allergy and Immunology (Immune System), Andrology and Male Infertility (Men's Health), Audiology (Hearing), Cardiology and Thoracic Surgery (Heart & Chest), Chest and Respiratory (Lungs), Diabetes and Endocrinology (Glands & Hormones), Diagnostic Radiology (X-Ray/Imaging), Dietitian and Nutrition (Diet), Family Medicine (General Practice), Gastroenterology and Endoscopy (Digestive System), General Practice (General), General Surgery (Surgery), Geriatrics (Elderly Care), Hematology (Blood), Hepatology (Liver), Internal Medicine (Internal Organs), Interventional Radiology (Imaging/Procedures), IVF and Infertility (Fertility), Laboratories (Lab Tests), Nephrology (Kidneys), Neurosurgery (Brain & Spine Surgery), Obesity and Laparoscopic Surgery (Weight Loss), Oncology (Cancer), Oncology Surgery (Cancer Surgery), Ophthalmology (Eyes), Osteopathy (Bone & Muscle System), Pain Management (Pain Relief), Pediatric Surgery (Child Surgery), Phoniatrics (Speech & Voice), Physiotherapy and Sport Injuries (Physical Therapy), Plastic Surgery (Cosmetic Surgery), Rheumatology (Joints & Muscles), Spinal Surgery (Spine), Urology (Urinary Tract), Vascular Surgery (Blood Vessels).

# EXAMPLE OF CUMULATIVE SUMMARY STYLE
History: User previously stated he has had a sore throat for 3 days.
Latest Message: 'It's also making it slightly hard to swallow solid food today.'
Output:
{
  ""user_facing_reply"": ""I understand that must be quite uncomfortable. Difficulty swallowing can make eating difficult.\n\nWe suggest sticking to soft foods, smooth warm soups, or cool fluids to stay hydrated. Resting your throat and avoiding acidic or highly seasoned foods can also prevent further irritation. If this worsening makes breathing difficult or if you develop a high fever, please let us know immediately so we can guide you to the right care."",
  ""classification"": ""clarification_needed"",
  ""recommended_departments"": [],
  ""clinical_assessment"": ""يعاني المستخدم من ألم في الحلق مستمر منذ ٣ أيام، ويشكو اليوم من صعوبة طفيفة في بلع الأطعمة الصلبة."",
  ""urgency_level"": ""medium"",
  ""topic_drift_detected"": false
}

# TOPIC DRIFT FLAG
- If the user strays significantly from the original medical context or asks non-medical questions, set ""topic_drift_detected"" to true. Otherwise, set it to false.
";

            Schema Diagnosis = new Schema
            {
                Type = Type.Object,
                Title = "Diagnosis",
                Required = new List<string> { "user_facing_reply", "classification", "recommended_departments", "clinical_assessment", "urgency_level", "topic_drift_detected" },
                PropertyOrdering = new List<string> { "user_facing_reply", "classification", "recommended_departments", "clinical_assessment", "urgency_level", "topic_drift_detected" },
                Properties = new Dictionary<string, Schema>
                {
                    { "user_facing_reply", new Schema { Type = Type.String, Description = "Patient-facing empathetic response matching the user's language." } },
                    { "classification", new Schema { Type = Type.String, Description = "Must be: wellness_suggestion, clarification_needed, or doctor_escalation" } },
                    {
                        "recommended_departments", new Schema
                        {
                            Type = Type.Array,
                            Items = new Schema { Type = Type.String },
                            Description = "Array of strings selected strictly from the allowed departments if escalated. Otherwise an empty array []."
                        }
                    },
                    {
                        "clinical_assessment", new Schema {
                            Type = Type.String,
                            Description = "COMPULSORY: A full, cumulative running summary of ALL symptoms and details stated across the entire conversation history in Modern Standard Arabic (MSA). Assume the doctor sees nothing else but this text."
                        }
                    },
                    { "urgency_level", new Schema { Type = Type.String, Description = "Must be: low, medium, high, emergency" } },
                    { "topic_drift_detected", new Schema { Type = Type.Boolean, Description = "Set to true if user strays from the medical context." } }
                }
            };

            var generateContentConfig = new GenerateContentConfig
            {
                SystemInstruction = new Content
                {
                    Parts = new List<Part> { new Part { Text = systemInstruction } }
                },
                ResponseMimeType = "application/json",
                ResponseSchema = Diagnosis
            };

            var parts = new List<Part>();
            
            var match = System.Text.RegularExpressions.Regex.Match(msg, @"((?:https?:\/\/|\/api\/files\/)[^\n]+?\.(?:jpg|jpeg|png|webp|heic|heif|mp4|mov|avi|webm|wmv|mpeg|mpg|flv|3gpp|pdf))", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            
            if (match.Success)
            {
                string url = match.Groups[1].Value.Trim();
                try
                {
                    byte[] bytes;
                    if (url.StartsWith("/api/files/"))
                    {
                        var objectKey = url.Substring("/api/files/".Length);
                        bytes = await fileService.GetFileBytesAsync(objectKey);
                    }
                    else
                    {
                        bytes = await _httpClient.GetByteArrayAsync(url);
                    }
                    
                    string ext = System.IO.Path.GetExtension(url).ToLower();
                    string mimeType = "application/octet-stream";
                    if (ext == ".jpg" || ext == ".jpeg") mimeType = "image/jpeg";
                    else if (ext == ".png") mimeType = "image/png";
                    else if (ext == ".pdf") mimeType = "application/pdf";

                    string fileName = Guid.NewGuid().ToString() + ext;
                    var uploadConfig = new UploadFileConfig { MimeType = mimeType, DisplayName = fileName };
                    var uploadedFile = await client.Files.UploadAsync(bytes, fileName, uploadConfig);
                    parts.Add(new Part { FileData = new FileData { FileUri = uploadedFile.Uri, MimeType = mimeType } });
                    
                    // Remove the URL from the message so the model doesn't get confused and refuse to "open links"
                    msg = msg.Replace(url, "").Trim();
                }
                catch { }
            }

            string promptPayload = $"History of session:\n{prevContext}\n\nLatest Message from user:\n{msg}";
            parts.Add(new Part { Text = promptPayload });

            var contentList = new List<Content> { new Content { Parts = parts } };

            var response = await client.Models.GenerateContentAsync(
                 model: "gemini-3.1-flash-lite",
                 contents: contentList,
                 config: generateContentConfig
            );

            return response?.Candidates?[0]?.Content?.Parts?[0].Text ?? "";
        }
    }
}
