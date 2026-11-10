import sys
import os
import io
import pypdf
from reportlab.pdfgen import canvas

def generate_participant_certificate(attendee_name, reg_id, institution='', team_name='', output_pdf_path=''):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(base_dir, 'snd26-cert-template-signed.pdf')
    
    if not os.path.exists(template_path):
        template_path = os.path.join(base_dir, 'assets', 'cert_base_template.pdf')
        
    base_reader = pypdf.PdfReader(template_path)
    base_page = base_reader.pages[0]
    
    # Official signed template dimensions: 595.5 x 850.08 pt (Portrait A4)
    page_w = 595.5
    page_h = 850.08
    center_x = page_w / 2.0  # 297.75 pt
    
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(page_w, page_h))
    
    # 1. Running Number / Certificate Serial Number at top right
    # Clean running number format, e.g. "NO: ISN-26001"
    clean_id = reg_id.strip() if reg_id else 'ISN-26000'
    running_no_str = f"NO: {clean_id}"
    
    can.setFillColorRGB(0.35, 0.38, 0.45)
    can.setFont('Helvetica-Bold', 10)
    can.drawRightString(page_w - 48, 804, running_no_str)
    
    # 2. Recipient Full Name
    # Centered in the open gap between "This is to certify that" (Y ~ 462 pt) 
    # and "has successfully participated in" (Y ~ 397 pt).
    name_str = attendee_name.strip().upper()
    font_size = 21 if len(name_str) < 30 else (17 if len(name_str) < 42 else 14)
    
    # Navy tone matching ISN certificate theme: rgb(17, 19, 63)
    can.setFillColorRGB(0.067, 0.075, 0.247)
    can.setFont('Helvetica-Bold', font_size)
    can.drawCentredString(center_x, 436, name_str)
    
    # 3. Subtitle Line (Institution & Running Number / Team)
    sub_parts = []
    if institution and institution.strip():
        sub_parts.append(institution.strip())
    sub_parts.append(f"Reg ID: {clean_id}")
    if team_name and team_name.strip():
        sub_parts.append(team_name.strip())
    sub_text = '   \u2022   '.join(sub_parts)
    
    can.setFillColorRGB(0.38, 0.41, 0.50)
    can.setFont('Helvetica-Bold', 9.5)
    can.drawCentredString(center_x, 415, sub_text)
    
    can.save()
    packet.seek(0)
    
    overlay_reader = pypdf.PdfReader(packet)
    writer = pypdf.PdfWriter()
    base_page.merge_page(overlay_reader.pages[0])
    writer.add_page(base_page)
    
    if output_pdf_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_pdf_path)), exist_ok=True)
        with open(output_pdf_path, 'wb') as f:
            writer.write(f)
        print(f'SUCCESS:{output_pdf_path}')
    else:
        print('ERROR: No output path provided')

if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else 'Nurliyana binti Abdul Razak'
    reg_id = sys.argv[2] if len(sys.argv) > 2 else 'ISN-26001'
    inst = sys.argv[3] if len(sys.argv) > 3 else 'UCSI University'
    team = sys.argv[4] if len(sys.argv) > 4 else 'Team Pink'
    out = sys.argv[5] if len(sys.argv) > 5 else os.path.join(os.path.dirname(__file__), 'assets', 'certificates', 'test_sample_cert.pdf')
    generate_participant_certificate(name, reg_id, inst, team, out)
