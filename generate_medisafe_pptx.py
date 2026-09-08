from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

# Initialize presentation
prs = Presentation()
prs.slide_width = Inches(10)
prs.slide_height = Inches(5.625)

# Brand Color Palette
PRIMARY = RGBColor(0, 105, 92)     # Deep Teal
ACCENT = RGBColor(0, 150, 136)     # Light Teal
SECONDARY = RGBColor(255, 111, 0)  # Orange/Amber
LIGHT = RGBColor(236, 240, 241)    # Light Gray
DARK = RGBColor(33, 33, 33)        # Dark Text
WHITE = RGBColor(255, 255, 255)    # White
SUCCESS = RGBColor(46, 125, 50)    # Green

# Theme Colors for Charts
CHART_COLORS = [PRIMARY, ACCENT, SECONDARY, RGBColor(156, 39, 176), SUCCESS, RGBColor(255, 152, 0)]

def blank_slide(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])

def add_title(slide, text, color=PRIMARY):
    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(9), Inches(0.5))
    title_frame = title_box.text_frame
    title_frame.text = text
    p = title_frame.paragraphs[0]
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = color
    
    # Add underline
    line = slide.shapes.add_shape(1, Inches(0.5), Inches(0.9), Inches(9), Inches(0))
    line.line.color.rgb = PRIMARY
    line.line.width = Pt(2)

def add_bar_chart(slide, data, x_start=0.5, y_start=1.3, max_width=4.5, bar_height=0.45, spacing=0.6):
    y_pos = y_start
    for i, (label, pct) in enumerate(data):
        color = CHART_COLORS[i % len(CHART_COLORS)]
        
        # Background track
        bg = slide.shapes.add_shape(1, Inches(x_start), Inches(y_pos), Inches(max_width), Inches(bar_height))
        bg.fill.solid()
        bg.fill.fore_color.rgb = RGBColor(240, 240, 240)
        bg.line.color.rgb = RGBColor(240, 240, 240)
        
        # Data bar
        bar_width = (max_width * pct) / 100
        if bar_width > 0:
            bar = slide.shapes.add_shape(1, Inches(x_start), Inches(y_pos), Inches(bar_width), Inches(bar_height))
            bar.fill.solid()
            bar.fill.fore_color.rgb = color
            bar.line.color.rgb = color
        
        # Label
        lbl_box = slide.shapes.add_textbox(Inches(x_start + 0.1), Inches(y_pos + 0.05), Inches(max_width - 0.8), Inches(bar_height))
        lbl_frame = lbl_box.text_frame
        lbl_frame.text = label
        p = lbl_frame.paragraphs[0]
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = WHITE if bar_width > 2 else DARK
        
        # Percentage
        pct_box = slide.shapes.add_textbox(Inches(x_start + max_width + 0.1), Inches(y_pos + 0.05), Inches(0.8), Inches(bar_height))
        pct_frame = pct_box.text_frame
        pct_frame.text = f"{pct}%"
        p = pct_frame.paragraphs[0]
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = color
        p.alignment = PP_ALIGN.RIGHT
        
        y_pos += spacing

def add_side_panel(slide, title, content, bg_color=LIGHT, border_color=PRIMARY):
    panel_title = slide.shapes.add_textbox(Inches(5.5), Inches(1.3), Inches(4), Inches(0.3))
    tf = panel_title.text_frame
    tf.text = title
    p = tf.paragraphs[0]
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    panel_box = slide.shapes.add_shape(1, Inches(5.5), Inches(1.7), Inches(4), Inches(3.5))
    panel_box.fill.solid()
    panel_box.fill.fore_color.rgb = bg_color
    panel_box.line.color.rgb = border_color
    panel_box.line.width = Pt(2)
    
    panel_text = slide.shapes.add_textbox(Inches(5.7), Inches(1.9), Inches(3.6), Inches(3.1))
    tf = panel_text.text_frame
    tf.word_wrap = True
    tf.text = content
    for p in tf.paragraphs:
        p.font.size = Pt(11)
        p.font.color.rgb = DARK
        p.space_before = Pt(6)

# ==========================================
# SLIDE 1: Title
# ==========================================
slide = blank_slide(prs)
bg = slide.background.fill
bg.solid()
bg.fore_color.rgb = PRIMARY

title = slide.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(9), Inches(1))
tf = title.text_frame
tf.text = "MediSafe"
p = tf.paragraphs[0]
p.font.size = Pt(54)
p.font.bold = True
p.font.color.rgb = WHITE
p.alignment = PP_ALIGN.CENTER

sub = slide.shapes.add_textbox(Inches(0.5), Inches(2.5), Inches(9), Inches(0.6))
tf = sub.text_frame
tf.text = "Smart Medicine Box"
p = tf.paragraphs[0]
p.font.size = Pt(32)
p.font.color.rgb = LIGHT
p.alignment = PP_ALIGN.CENTER

tag = slide.shapes.add_textbox(Inches(0.5), Inches(3.2), Inches(9), Inches(0.4))
tf = tag.text_frame
tf.text = "Survey Analysis & Key Findings"
p = tf.paragraphs[0]
p.font.size = Pt(18)
p.font.italic = True
p.font.color.rgb = SECONDARY
p.alignment = PP_ALIGN.CENTER

foot = slide.shapes.add_textbox(Inches(0.5), Inches(4.5), Inches(9), Inches(0.4))
tf = foot.text_frame
tf.text = "Industrial Product Design Lab"
p = tf.paragraphs[0]
p.font.size = Pt(14)
p.font.color.rgb = LIGHT
p.alignment = PP_ALIGN.CENTER

# ==========================================
# SLIDE 2: Problem Statement
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Problem Statement")

text_box = slide.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(9), Inches(2.5))
tf = text_box.text_frame
tf.word_wrap = True
points = [
    "Medication non-adherence affects millions of patients worldwide.",
    "Elderly and chronic disease patients struggle with medication management.",
    "Common issues: Forgetting doses, duplicate doses, wrong medicine intake.",
    "Lack of caregiver visibility and remote monitoring.",
    "Existing pill organizers are passive with no active reminders or tracking."
]
for pt in points:
    p = tf.add_paragraph()
    p.text = f"• {pt}"
    p.font.size = Pt(16)
    p.font.color.rgb = DARK
    p.space_before = Pt(10)

box = slide.shapes.add_shape(1, Inches(0.5), Inches(4.0), Inches(9), Inches(1.0))
box.fill.solid()
box.fill.fore_color.rgb = RGBColor(224, 242, 241)
box.line.color.rgb = PRIMARY
box.line.width = Pt(2)
sol_text = slide.shapes.add_textbox(Inches(0.6), Inches(4.1), Inches(8.8), Inches(0.8))
tf = sol_text.text_frame
tf.text = "OUR SOLUTION:\nAn affordable, IoT-enabled medicine organizer with smart reminders, dose confirmation, and caregiver notifications."
p = tf.paragraphs[0]
p.font.bold = True
p.font.color.rgb = PRIMARY
p.font.size = Pt(14)
for p in tf.paragraphs:
    p.alignment = PP_ALIGN.CENTER

# ==========================================
# SLIDE 3: Survey Overview
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Survey Overview")

metrics = [("29", "Total\nResponses", "👥"), ("100%", "Completion\nRate", "✓"), ("Aug 12-13", "Date\nRange", "📅")]
x = 0.5
for val, lbl, icon in metrics:
    box = slide.shapes.add_shape(1, Inches(x), Inches(1.5), Inches(2.8), Inches(1.5))
    box.fill.solid()
    box.fill.fore_color.rgb = LIGHT
    box.line.color.rgb = PRIMARY
    
    tf = slide.shapes.add_textbox(Inches(x), Inches(1.7), Inches(2.8), Inches(1.3)).text_frame
    tf.text = f"{icon}\n{val}"
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(24)
    p = tf.paragraphs[1]
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    p.alignment = PP_ALIGN.CENTER
    
    lbl_box = slide.shapes.add_textbox(Inches(x), Inches(2.4), Inches(2.8), Inches(0.5))
    p = lbl_box.text_frame.paragraphs[0]
    p.text = lbl
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(12)
    p.font.color.rgb = DARK
    x += 3.1

add_side_panel(slide, "Key Insight", "💡 65.5% of respondents SOMETIMES forgot to take medication on time, and 20.7% FREQUENTLY forget.\n\n🎯 This validates an urgent and undeniable market need for automated reminders and tracking.", RGBColor(255, 243, 224), SECONDARY)
panel_box = slide.shapes[-2] # Adjust dimensions to span bottom instead
panel_box.left, panel_box.top, panel_box.width, panel_box.height = Inches(0.5), Inches(3.5), Inches(9), Inches(1.5)
slide.shapes[-1].left, slide.shapes[-1].top, slide.shapes[-1].width, slide.shapes[-1].height = Inches(0.7), Inches(3.7), Inches(8.6), Inches(1.3)
slide.shapes[-3].left, slide.shapes[-3].top = Inches(0.5), Inches(3.2)

# ==========================================
# SLIDE 4: Demographics
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Respondent Demographics: Age Groups")
data = [("18–30", 65.5), ("31–45", 17.2), ("Below 18", 10.3), ("46–60", 6.9)]
add_bar_chart(slide, data, x_start=0.5, y_start=1.6)
add_side_panel(slide, "Demographic Insights", "📊 Tech-savvy young adults (18-30) dominate the dataset (65.5%).\n\n🎯 INFERENCE:\nPerfect demographic for high mobile app adoption and quick market penetration.\n\nUsers are highly capable of setting up IoT devices for their elderly family members.")

# ==========================================
# SLIDE 5: Medication Usage
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Medication Usage Patterns")
data = [("Once a day", 38.0), ("Occasionally", 27.0), ("Multiple times/day", 24.0), ("Caregiver help", 10.0)]
add_bar_chart(slide, data, x_start=0.5, y_start=1.6)
add_side_panel(slide, "Usage Insights", "🔄 Diverse user base spans all medication frequency levels.\n\n🎯 INFERENCE:\nThe product must accommodate both simple (once a day) and complex (multiple times a day) scheduling routines to capture the full market.\n\nCaregiver integration is essential for the 10% relying on assistance.")

# ==========================================
# SLIDE 6: Adherence Challenge
# ==========================================
slide = blank_slide(prs)
add_title(slide, "The Adherence Challenge: Missed Doses")
data = [("Sometimes", 65.5), ("Frequently", 20.7), ("Rarely", 6.9), ("Never", 6.9)]
add_bar_chart(slide, data, x_start=0.5, y_start=1.6)
add_side_panel(slide, "Critical Insight", "🚨 86.2% have forgotten their medication on time.\n\n🎯 INFERENCE:\nThis is the core problem. It validates the critical market need for active automated reminders and precise dose tracking.\n\nMediSafe directly addresses this pain point with proven market validation.", RGBColor(255, 235, 238), RGBColor(211, 47, 47))

# ==========================================
# SLIDE 7: Current Methods
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Current Medication Management Methods")
data = [("No specific method", 34.5), ("Phone alarm", 13.8), ("Traditional pill box", 10.3), ("Calendar / Written", 10.3)]
add_bar_chart(slide, data, x_start=0.5, y_start=1.6)
add_side_panel(slide, "Market Opportunity", "💡 34.5% use NO method at all.\n\n🎯 INFERENCE:\nThere is an enormous, untapped market opportunity.\n\nExisting solutions (alarms, basic boxes) are fragmented and insufficient. MediSafe can capture this massive whitespace by offering an all-in-one smart solution.")

# ==========================================
# SLIDE 8: Priority Features
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Feature Importance: Core Priorities")
data = [("Medication Reminders", 93.0), ("Before/After Food Alerts", 79.0), ("Dose Confirmation", 79.0), ("Easy-to-Open Compartments", 72.0)]
add_bar_chart(slide, data, x_start=0.5, y_start=1.5, max_width=7.5, spacing=0.8)
note = slide.shapes.add_textbox(Inches(0.5), Inches(4.8), Inches(9), Inches(0.4))
tf = note.text_frame
tf.text = "✓ VALIDATION: All core features score 70%+ importance, confirming strong product-market fit."
p = tf.paragraphs[0]
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = SUCCESS

# ==========================================
# SLIDE 9: Advanced Features
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Feature Importance: Advanced Features")
data = [("Refill Reminders", 83.0), ("Caregiver Notifications", 72.0), ("Medication History Tracking", 72.0), ("LED Slot Indication", 45.0)]
add_bar_chart(slide, data, x_start=0.5, y_start=1.5, max_width=7.5, spacing=0.8)

# ==========================================
# SLIDE 10: Buying Drivers
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Purchase Drivers: What Triggers a Buy?")
data = [("Affordable Price", 96.0), ("Simple & Easy to Use", 93.0), ("Large Display", 79.0), ("Reliable Reminders", 76.0), ("Mobile App Integration", 62.0), ("Caregiver Monitoring", 58.0)]
add_bar_chart(slide, data, x_start=0.5, y_start=1.4, max_width=8.0, bar_height=0.35, spacing=0.6)

# ==========================================
# SLIDE 11: Adoption Intent
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Market Demand: Would You Use MediSafe?")
data = [("Very Important", 41.4), ("Important", 41.4), ("Slightly Important", 13.8), ("Not Important", 3.4)]
add_bar_chart(slide, data, x_start=0.5, y_start=1.6)
add_side_panel(slide, "Adoption Outlook", "🚀 82.8% rated the MediSafe solution as Very Important or Important.\n\n🎯 INFERENCE:\nThis indicates a STRONG adoption likelihood post-launch.\n\nThis is a critical validation signal for overall product viability, pricing strategy, and market readiness.", RGBColor(232, 245, 233), SUCCESS)

# ==========================================
# SLIDE 12: Key Conclusions
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Key Conclusions from Data Synthesis")
conclusions = [
    ("1", "Strong Market Need", "86.2% forgot meds—MediSafe solves a proven, critical pain point."),
    ("2", "Tech-Savvy Audience", "65.5% are age 18-30, highly comfortable with mobile tech and IoT."),
    ("3", "Feature Validation", "All proposed core features scored 70%+ importance—perfect market fit."),
    ("4", "Price Sweet Spot", "Affordability is the #1 driver (96%)—our ₹2,800–3,500 target is competitive."),
    ("5", "High Adoption Potential", "82.8% rate the solution important—providing a massive green light for launch.")
]

y_start = 1.3
for num, title, desc in conclusions:
    num_box = slide.shapes.add_textbox(Inches(0.5), Inches(y_start), Inches(0.6), Inches(0.5))
    tf = num_box.text_frame
    tf.text = num
    p = tf.paragraphs[0]
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    
    text_box = slide.shapes.add_textbox(Inches(1.2), Inches(y_start), Inches(8.3), Inches(0.6))
    tf = text_box.text_frame
    p1 = tf.paragraphs[0]
    p1.text = title
    p1.font.size = Pt(14)
    p1.font.bold = True
    p1.font.color.rgb = SECONDARY
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(12)
    p2.font.color.rgb = DARK
    
    y_start += 0.8

# ==========================================
# SLIDE 13: Next Steps
# ==========================================
slide = blank_slide(prs)
add_title(slide, "Next Steps & Recommendations")

steps = [
    ("Prioritize Core", ["Reliable Reminders", "Dose Confirmation", "Before/After Food Alerts"]),
    ("Mobile App", ["Elderly-friendly UI", "Caregiver alerts setup", "History & compliance logs"]),
    ("Market Entry", ["Position as affordable", "Target caregiver demographic", "Pharmacy partnerships"]),
    ("User Testing", ["Test UI with seniors", "Iterate on feedback", "Validate hardware usability"])
]

x = 0.5
for title, bullets in steps:
    box = slide.shapes.add_shape(1, Inches(x), Inches(1.8), Inches(2.1), Inches(3.2))
    box.fill.solid()
    box.fill.fore_color.rgb = LIGHT
    box.line.color.rgb = PRIMARY
    
    tf = slide.shapes.add_textbox(Inches(x), Inches(1.9), Inches(2.1), Inches(0.5)).text_frame
    tf.text = title
    p = tf.paragraphs[0]
    p.font.bold = True
    p.font.size = Pt(14)
    p.font.color.rgb = PRIMARY
    p.alignment = PP_ALIGN.CENTER
    
    y = 2.5
    for bullet in bullets:
        b_box = slide.shapes.add_textbox(Inches(x+0.1), Inches(y), Inches(1.9), Inches(0.6))
        tf = b_box.text_frame
        tf.word_wrap = True
        tf.text = f"• {bullet}"
        tf.paragraphs[0].font.size = Pt(11)
        y += 0.7
    x += 2.3

# ==========================================
# SLIDE 14: Thank You
# ==========================================
slide = blank_slide(prs)
bg = slide.background.fill
bg.solid()
bg.fore_color.rgb = PRIMARY

title = slide.shapes.add_textbox(Inches(0.5), Inches(2.0), Inches(9), Inches(1))
tf = title.text_frame
tf.text = "MediSafe"
p = tf.paragraphs[0]
p.font.size = Pt(64)
p.font.bold = True
p.font.color.rgb = WHITE
p.alignment = PP_ALIGN.CENTER

sub = slide.shapes.add_textbox(Inches(0.5), Inches(3.1), Inches(9), Inches(0.6))
tf = sub.text_frame
tf.text = "Right Medicine. Right Time. Peace of Mind."
p = tf.paragraphs[0]
p.font.size = Pt(22)
p.font.italic = True
p.font.color.rgb = LIGHT
p.alignment = PP_ALIGN.CENTER

foot = slide.shapes.add_textbox(Inches(0.5), Inches(4.5), Inches(9), Inches(0.5))
tf = foot.text_frame
tf.text = "Survey Analysis: 29 Respondents | Aug 12-13, 2026\nIndustrial Product Design Lab Project"
p = tf.paragraphs[0]
p.font.size = Pt(12)
p.font.color.rgb = RGBColor(178, 223, 219)
p.alignment = PP_ALIGN.CENTER
p2 = tf.paragraphs[1]
p2.font.size = Pt(12)
p2.font.color.rgb = RGBColor(178, 223, 219)
p2.alignment = PP_ALIGN.CENTER

# Save Presentation
filename = "MediSafe_Final_Presentation.pptx"
prs.save(filename)
print(f"Successfully generated: {filename}")
