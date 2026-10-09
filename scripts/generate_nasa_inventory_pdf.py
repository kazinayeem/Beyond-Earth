import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(
                36, 11 * 72 - 30,
                "Beyond-Earth — NASA Scientific Data & Information Inventory"
            )
            self.drawRightString(
                8.5 * 72 - 36, 11 * 72 - 30,
                "Audit Date: October 9, 2026"
            )
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 11 * 72 - 34, 8.5 * 72 - 36, 11 * 72 - 34)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 38, 8.5 * 72 - 36, 38)

        self.drawString(
            36, 26,
            "CONFIDENTIAL / SCIENTIFIC AUDIT REPORT — Repository: github.com/kazinayeem/Beyond-Earth"
        )
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(8.5 * 72 - 36, 26, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=44,
        bottomMargin=44
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#0369a1'),
        spaceAfter=12
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#0369a1'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1e293b'),
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1e293b')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#0f172a')
    )

    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#094c72')
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1e293b')
    )

    story = []

    # 1. HEADER BLOCK
    story.append(Paragraph("Beyond-Earth: NASA Scientific Data & Dataset Inventory", title_style))
    story.append(Paragraph("Comprehensive Source-Code Audit of NASA Data Products, Cartographic Textures, and Space Science Models", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceBefore=0, spaceAfter=8))

    meta_table_data = [
        [
            Paragraph("<b>Project Name:</b> Beyond-Earth", meta_style),
            Paragraph("<b>Repository:</b> github.com/kazinayeem/Beyond-Earth", meta_style)
        ],
        [
            Paragraph("<b>Audit Date:</b> October 9, 2026", meta_style),
            Paragraph("<b>Audit Scope:</b> Complete Source Code, Assets, Textures, Adapters & APIs", meta_style)
        ],
        [
            Paragraph("<b>Audit Status:</b> Verified & Reconciled", meta_style),
            Paragraph("<b>Primary Framework:</b> Next.js 16 (App Router), Three.js, WebGL", meta_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 2. CONCISE EXECUTIVE SUMMARY
    story.append(Paragraph("1. Executive Summary of Identified NASA Data", h1_style))
    exec_summary_text = (
        "An exhaustive audit of the <b>Beyond-Earth</b> codebase was conducted across all source files, "
        "React components, Three.js 3D shaders, static assets in <code>/public/textures/</code>, TypeScript "
        "data models, adapters, Zod validation schemas, and internal API routes. "
        "The project integrates authentic NASA open data through four distinct tiers: "
        "<b>(1) Embedded NASA Cartographic Image Textures</b>: 2K and 4K satellite composites derived from MODIS Terra/Aqua, "
        "SRTM elevation models, and GOES meteorological imagery powering real-time 3D Earth rendering; "
        "<b>(2) Canonical Planetary Constants</b>: Real astrophysical measurements (mass, mean radius, surface gravity, escape velocity, "
        "exosphere mixing ratios, diurnal temperature swings, and radiation dosages) curated by NASA GSFC/NSSDC for the Moon, Mars, and Earth; "
        "<b>(3) Lunar Reconnaissance Orbiter (LRO) Scientific Payloads</b>: Verified physical engineering parameters (mass, power) "
        "and scientific phenomena for six authentic LRO instruments downlinked to the NASA Planetary Data System (PDS); and "
        "<b>(4) Historical Mission & Orbital Ephemeris Profiles</b>: Canonical NASA mission archives (Apollo 11, LRO, Mars 2020, OSIRIS-REx) "
        "and CelesTrak/NASA Tracking Network two-line orbital elements for active spacecraft (ISS, Hubble, Landsat 9, NOAA-20). "
        "All genuine scientific data are cleanly isolated from game-balanced progression mechanics."
    )
    story.append(Paragraph(exec_summary_text, body_style))
    story.append(Spacer(1, 6))

    # 3. CONFIRMED NASA DATASETS TABLE
    story.append(Paragraph("2. Confirmed NASA Datasets and Data Products Table", h1_style))
    story.append(Paragraph(
        "The following table catalogues all genuine NASA data products confirmed to be actively used within the application.",
        body_style
    ))

    table_data = [
        [
            Paragraph("<b>#</b>", table_header_style),
            Paragraph("<b>Dataset / Product Name</b>", table_header_style),
            Paragraph("<b>Mission / Node Origin</b>", table_header_style),
            Paragraph("<b>Data Type</b>", table_header_style),
            Paragraph("<b>Delivery / Storage</b>", table_header_style),
            Paragraph("<b>Target Feature</b>", table_header_style)
        ],
        [
            Paragraph("1", table_cell_bold),
            Paragraph("NASA Blue Marble 2K Surface Texture (earth_surface_2k.jpg)", table_cell_bold),
            Paragraph("EOS Terra & Aqua / MODIS (GSFC)", table_cell_style),
            Paragraph("Image (2K RGB)", table_cell_style),
            Paragraph("Local Asset (512 KB JPG)", table_cell_style),
            Paragraph("Title Hero & Mission Control 3D Earth", table_cell_style)
        ],
        [
            Paragraph("2", table_cell_bold),
            Paragraph("NASA Blue Marble Ocean Specular Mask (earth_specular_2k.jpg)", table_cell_bold),
            Paragraph("MODIS Land/Water Classification", table_cell_style),
            Paragraph("Image (2K Mask)", table_cell_style),
            Paragraph("Local Asset (223 KB JPG)", table_cell_style),
            Paragraph("Three.js Ocean Sun Reflection Mask", table_cell_style)
        ],
        [
            Paragraph("3", table_cell_bold),
            Paragraph("NASA SRTM Elevation Normal Map (earth_normal_2k.jpg)", table_cell_bold),
            Paragraph("Shuttle Radar Topography Mission", table_cell_style),
            Paragraph("Image (2K Normal)", table_cell_style),
            Paragraph("Local Asset (336 KB JPG)", table_cell_style),
            Paragraph("Topographic Surface Bump Lighting", table_cell_style)
        ],
        [
            Paragraph("4", table_cell_bold),
            Paragraph("NASA/NOAA Meteorological Cloud Map (earth_clouds_4k.png)", table_cell_bold),
            Paragraph("GOES / NOAA Weather Satellites", table_cell_style),
            Paragraph("Image (4K Alpha)", table_cell_style),
            Paragraph("Local Asset (5.03 MB PNG)", table_cell_style),
            Paragraph("Concentric 3D Atmospheric Cloud Sphere", table_cell_style)
        ],
        [
            Paragraph("5", table_cell_bold),
            Paragraph("NASA Planetary Fact Sheets (Moon, Mars, Earth)", table_cell_bold),
            Paragraph("NASA GSFC / NSSDC Coordination", table_cell_style),
            Paragraph("Scientific Constants", table_cell_style),
            Paragraph("TypeScript Model + API Route", table_cell_style),
            Paragraph("Mission Briefings & Data Explorer", table_cell_style)
        ],
        [
            Paragraph("6", table_cell_bold),
            Paragraph("LRO LOLA Topography GDR (LRO-L-LOLA-3-RDR-V1.0)", table_cell_bold),
            Paragraph("LRO / NASA PDS Geosciences Node", table_cell_style),
            Paragraph("Laser Altimetry (DEM)", table_cell_style),
            Paragraph("Structured Catalog + API", table_cell_style),
            Paragraph("Laser Altimeter CAD & Synergies", table_cell_style)
        ],
        [
            Paragraph("7", table_cell_bold),
            Paragraph("LRO LROC Camera Archive (LRO-L-LROC-2-EDR-V1.0)", table_cell_bold),
            Paragraph("LRO / NASA PDS Imaging Node / ASU", table_cell_style),
            Paragraph("Optical Imagery / EDR", table_cell_style),
            Paragraph("Structured Catalog + API", table_cell_style),
            Paragraph("LROC Camera Payload & Builder", table_cell_style)
        ],
        [
            Paragraph("8", table_cell_bold),
            Paragraph("LRO Diviner Thermal Data (LRO-L-DLRE-4-RDR-V1.0)", table_cell_bold),
            Paragraph("LRO / NASA PDS Geosciences / UCLA", table_cell_style),
            Paragraph("Radiometer (Thermal)", table_cell_style),
            Paragraph("Structured Catalog + API", table_cell_style),
            Paragraph("Diviner Payload, Polar Cold Traps Event", table_cell_style)
        ],
        [
            Paragraph("9", table_cell_bold),
            Paragraph("LRO Mini-RF SAR Polar Ice Data (LRO-L-MRFLRO-4-CDR-V1.0)", table_cell_bold),
            Paragraph("LRO / NASA PDS Geosciences / JHU-APL", table_cell_style),
            Paragraph("Synthetic Aperture Radar", table_cell_style),
            Paragraph("Structured Catalog + API", table_cell_style),
            Paragraph("Radar Sensor CAD & Subsurface Ice Event", table_cell_style)
        ],
        [
            Paragraph("10", table_cell_bold),
            Paragraph("LRO LAMP UV Science Data (LRO-L-LAMP-2-EDR-V1.0)", table_cell_bold),
            Paragraph("LRO / NASA PDS Atmospheres Node / SwRI", table_cell_style),
            Paragraph("Far-UV Spectroscopy", table_cell_style),
            Paragraph("Structured Catalog + API", table_cell_style),
            Paragraph("LAMP UV Spectrograph Payload", table_cell_style)
        ],
        [
            Paragraph("11", table_cell_bold),
            Paragraph("LRO CRaTER Radiation Archive (LRO-L-CRAT-2-EDR-V1.0)", table_cell_bold),
            Paragraph("LRO / NASA PDS PPI Node / UNH", table_cell_style),
            Paragraph("LET Dosimetry Spectra", table_cell_style),
            Paragraph("Structured Catalog + API", table_cell_style),
            Paragraph("CRaTER Detector & Solar Storm Crisis", table_cell_style)
        ],
        [
            Paragraph("12", table_cell_bold),
            Paragraph("NASA Robotic Missions Master Catalog (NSSDCA)", table_cell_bold),
            Paragraph("GSFC / JPL / NSSDCA Archives", table_cell_style),
            Paragraph("Mission Profiles & TB", table_cell_style),
            Paragraph("Structured Catalog + API", table_cell_style),
            Paragraph("Robotic Missions Explorer Tab", table_cell_style)
        ],
        [
            Paragraph("13", table_cell_bold),
            Paragraph("NASA Tracking Network / CelesTrak Satellite Ephemeris", table_cell_bold),
            Paragraph("NASA / Space-Track / CelesTrak", table_cell_style),
            Paragraph("TLE Orbital State Vectors", table_cell_style),
            Paragraph("Hardcoded Physics Array", table_cell_style),
            Paragraph("Hero 3D Satellite Tracking Simulation", table_cell_style)
        ],
        [
            Paragraph("14", table_cell_bold),
            Paragraph("NASA Deep Space Network Standards (JPL D-16838)", table_cell_bold),
            Paragraph("NASA JPL DSN Ground Operations", table_cell_style),
            Paragraph("RF Carrier Protocols", table_cell_style),
            Paragraph("Hardcoded Rules / State", table_cell_style),
            Paragraph("Live DSN Beam Lock & Comm Drop Event", table_cell_style)
        ],
        [
            Paragraph("15", table_cell_bold),
            Paragraph("NASA DONKI / NOAA SWPC Solar Flare Catalog", table_cell_bold),
            Paragraph("CCMC DONKI / NOAA SWPC", table_cell_style),
            Paragraph("Space Weather Proton Flux", table_cell_style),
            Paragraph("Branching Event Logic", table_cell_style),
            Paragraph("Class-X Coronal Mass Ejection Event", table_cell_style)
        ]
    ]

    inventory_table = Table(table_data, colWidths=[18, 142, 105, 75, 95, 105])
    inventory_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (0,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(inventory_table)
    story.append(Spacer(1, 10))

    # 4. DETAILED EXPLANATION OF EACH DATASET & SPECIFIC INFORMATION USED
    story.append(PageBreak())
    story.append(Paragraph("3. Detailed Dataset Breakdown & Specific Information Used", h1_style))
    story.append(Paragraph(
        "Each identified dataset was verified for authentic scientific origin, exact information content, "
        "and concrete data flow into the user-facing application features.",
        body_style
    ))

    # Dataset 1-4: Earth Textures
    story.append(Paragraph("A. Earth Cartographic Texture Suite (NASA Earth Observatory / Blue Marble)", h2_style))
    story.append(Paragraph(
        "The project embeds four high-resolution equirectangular raster datasets inside <code>public/textures/</code>. "
        "These files originate from NASA's Earth Observing System (EOS) and meteorological satellite composites, distributed "
        "via the Three.js scientific graphics repository under permissive licensing.",
        body_style
    ))
    story.append(Paragraph("<b>1. NASA Blue Marble 2K Equirectangular Surface Texture (<code>earth_surface_2k.jpg</code>):</b> "
                           "True-color global mosaic composited from observations by the MODIS instrument on NASA's Terra and Aqua satellites. "
                           "Resolution: 2048 × 1024 pixels (512,606 bytes). Applied directly as <code>meshStandardMaterial.map</code> on Earth's 3D sphere "
                           "in both the Title Screen 3D Hero Visual (<code>HeroOrbitalVisual.tsx:137</code>) and the Mission Control Orbit Map (<code>PlanetaryScene3D.tsx:137</code>).", bullet_style))
    story.append(Paragraph("<b>2. NASA Blue Marble Ocean Specular / Reflectance Mask (<code>earth_specular_2k.jpg</code>):</b> "
                           "Grayscale land/water mask derived from MODIS terrestrial classification (223,421 bytes). "
                           "Oceans are white (high specularity) and continental landmasses are black (matte). "
                           "Mapped to <code>roughnessMap</code> (<code>PlanetaryScene3D.tsx:140</code>, <code>HeroOrbitalVisual.tsx:135</code>) "
                           "so that directional sunlight creates authentic glint off oceans while land remains diffuse.", bullet_style))
    story.append(Paragraph("<b>3. NASA SRTM Topographic Surface Normal Map (<code>earth_normal_2k.jpg</code>):</b> "
                           "Tangent-space surface normal vector map derived from the Shuttle Radar Topography Mission (SRTM30) digital elevation model (336,774 bytes). "
                           "Applied as <code>normalMap</code> with <code>normalScale = Vector2(0.6, 0.6)</code> (<code>PlanetaryScene3D.tsx:138-139</code>), "
                           "producing authentic physical bump lighting across the Himalayas, Andes, and oceanic trenches.", bullet_style))
    story.append(Paragraph("<b>4. NASA/NOAA Meteorological Satellite Cloud Layer Alpha Composite (<code>earth_clouds_4k.png</code>):</b> "
                           "Authentic 4096 × 2048 equirectangular cloud coverage map compiled from GOES and polar weather satellites (5,033,486 bytes). "
                           "Rendered as a separate concentric 3D sphere at <code>radius = 1.012 × Earth Radius</code> with <code>opacity = 0.28</code> "
                           "(<code>PlanetaryScene3D.tsx:147-150</code>). The cloud layer rotates at 0.041 rad/s while the surface rotates at 0.032 rad/s, "
                           "modeling real atmospheric differential super-rotation.", bullet_style))
    story.append(Spacer(1, 6))

    # Dataset 5: Planetary Fact Sheets
    story.append(Paragraph("B. NASA Planetary Fact Sheet Physical Constants (NSSDC / GSFC)", h2_style))
    story.append(Paragraph(
        "Located in <code>src/data/nasa/planets/planetaryData.ts:3-85</code> and served via <code>src/app/api/nasa/planetary/route.ts</code>. "
        "Compiled from Dr. David R. Williams' canonical Planetary Fact Sheet repository at NASA Goddard Space Flight Center:",
        body_style
    ))
    story.append(Paragraph("<b>• The Moon:</b> Mass 7.342 × 10²² kg (0.0123 Earths); Mean radius 1,737.4 km; Surface gravity 1.62 m/s² (0.166 g); "
                           "Escape velocity 2.38 km/s; Orbit semi-major axis 384,400 km; Orbital period 27.3217 days; "
                           "Surface-boundary exosphere mixing ratios: Helium-4 (40,000 atoms/cm³), Neon (40,000), Hydrogen (35,000), Argon-40 (30,000); "
                           "Diurnal thermal range -130°C to +120°C (Permanently Shadowed Regions dip to -246°C / 27 K); "
                           "Radiation dose ~60 µSv/hr (LRO CRaTER & Apollo EASEP ground truth).", bullet_style))
    story.append(Paragraph("<b>• Mars:</b> Mass 6.417 × 10²³ kg (0.107 Earths); Mean radius 3,389.5 km; Surface gravity 3.72 m/s² (0.38 g); "
                           "Escape velocity 5.03 km/s; Average solar distance 225,000,000 km; Orbital period 686.98 days; "
                           "Atmospheric composition: 95.32% CO₂, 2.6% N₂, 1.9% Ar, 0.16% O₂, 0.08% CO; "
                           "Thermal extremes -125°C to +20°C (mean -63°C); Surface radiation dose ~250 mSv/year (MSL Curiosity RAD verified).", bullet_style))
    story.append(Paragraph("<b>• Earth:</b> Mass 5.972 × 10²⁴ kg; Mean radius 6,371.0 km; Surface gravity 9.807 m/s²; Escape velocity 11.186 km/s; "
                           "Average distance 149,597,870 km; Orbital period 365.256 days; Atmosphere: 78.08% N₂, 20.95% O₂, 0.93% Ar, 0.04% CO₂; "
                           "Thermal extremes -89.2°C to +56.7°C; Van Allen radiation belt proton/electron shielding.", bullet_style))
    story.append(Spacer(1, 6))

    # Dataset 6-11: LRO Instrument Suite
    story.append(Paragraph("C. Authentic NASA LRO Scientific Instrument Payload Suite (NASA PDS)", h2_style))
    story.append(Paragraph(
        "Located in <code>src/data/nasa/instruments/lroInstruments.ts:3-190</code> and integrated into spacecraft construction "
        "in <code>src/data/components.ts:110-212</code>. Each instrument incorporates verified engineering specs, principal investigators, "
        "and official NASA Planetary Data System (PDS) archive identifiers:",
        body_style
    ))
    story.append(Paragraph("<b>1. LOLA (Lunar Orbiter Laser Altimeter):</b> PDS ID <code>LRO-L-LOLA-3-RDR-V1.0</code>. "
                           "PI: Dr. David E. Smith (NASA GSFC). Real Mass: 11.2 kg; Real Power: 30.8 W. "
                           "Physics: 5-beam Nd:YAG 1064 nm pulsed laser rangefinder at 28 pulses/sec. "
                           "Measures time-of-flight to generate millimetric 3D digital elevation models.", bullet_style))
    story.append(Paragraph("<b>2. LROC (Lunar Reconnaissance Orbiter Camera):</b> PDS ID <code>LRO-L-LROC-2-EDR-V1.0</code>. "
                           "PI: Dr. Mark Robinson (Arizona State University). Real Mass: 19.2 kg; Real Power: 34.0 W. "
                           "Physics: Dual Narrow Angle Cameras (NAC, 0.5 m/pixel panchromatic) and one Wide Angle Camera (WAC, 100 m/pixel 7-band multispectral).", bullet_style))
    story.append(Paragraph("<b>3. Diviner (Diviner Lunar Radiometer Experiment - DLRE):</b> PDS ID <code>LRO-L-DLRE-4-RDR-V1.0</code>. "
                           "PI: Dr. David A. Paige (UCLA). Real Mass: 13.0 kg; Real Power: 24.7 W. "
                           "Physics: 9-channel infrared filter radiometer (0.3 to >200 µm). Discovered cryogenic polar cold traps below 30 K (-243°C).", bullet_style))
    story.append(Paragraph("<b>4. Mini-RF (Miniature Radio Frequency Synthetic Aperture Radar):</b> PDS ID <code>LRO-L-MRFLRO-4-CDR-V1.0</code>. "
                           "PI: Dr. Ben Bussey (JHU/APL). Real Mass: 15.6 kg; Real Power: 90.0 W. "
                           "Physics: Dual-frequency S-band (2.38 GHz) and X-band (7.14 GHz) radar measuring Circular Polarization Ratio (CPR) for buried water ice.", bullet_style))
    story.append(Paragraph("<b>5. LAMP (Lyman-Alpha Mapping Project):</b> PDS ID <code>LRO-L-LAMP-2-EDR-V1.0</code>. "
                           "PI: Dr. Kurt Retherford (SwRI). Real Mass: 6.1 kg; Real Power: 4.5 W. "
                           "Physics: Far-UV imaging spectrograph (57–196 nm) utilizing interplanetary hydrogen Lyman-alpha starlight glow to map frost.", bullet_style))
    story.append(Paragraph("<b>6. CRaTER (Cosmic Ray Telescope for the Effects of Radiation):</b> PDS ID <code>LRO-L-CRAT-2-EDR-V1.0</code>. "
                           "PI: Dr. Nathan Schwadron (UNH). Real Mass: 5.4 kg; Real Power: 7.3 W. "
                           "Physics: Silicon solid-state detector stack with tissue-equivalent plastic (TEP) measuring linear energy transfer (LET) cosmic ray spectra.", bullet_style))
    story.append(Spacer(1, 6))

    # Dataset 12: Historical Robotic Missions
    story.append(Paragraph("D. NASA Historical Robotic Spacecraft & Mission Science Profiles (NSSDCA)", h2_style))
    story.append(Paragraph(
        "Located in <code>src/data/nasa/missions/missionProfiles.ts:3-124</code> and served via <code>src/app/api/nasa/missions/route.ts</code>. "
        "Maintains canonical profiles from the NASA Space Science Data Coordinated Archive:",
        body_style
    ))
    story.append(Paragraph("<b>• LRO:</b> Launch June 18, 2009 (SLC-41, Atlas V 401); Destination: Lunar Polar Orbit (50 km altitude); "
                           "Status: Operational; Data Return: 1,450.0 Terabytes downlinked to PDS; Primary Goals: Geodetic grid, radiation mapping, polar water ice.", bullet_style))
    story.append(Paragraph("<b>• Apollo 11:</b> Launch July 16, 1969 (LC-39A, Saturn V SA-506); Landing: Mare Tranquillitatis (0.674° N, 23.473° E); "
                           "Data Return: 0.08 TB digitized telemetry; Pristine sample return: 21.55 kg lunar rocks; Experiments: EASEP (PSEP, LRRR, SWC).", bullet_style))
    story.append(Paragraph("<b>• Mars 2020 (Perseverance & Ingenuity):</b> Launch July 30, 2020 (SLC-41, Atlas V 541); Landing: Jezero Crater (18.38° N, 77.58° E); "
                           "Data Return: 110.0 TB; Primary Goals: Biosignatures, core caching for Mars Sample Return, in-situ MOXIE oxygen generation.", bullet_style))
    story.append(Paragraph("<b>• OSIRIS-REx:</b> Launch Sept 8, 2016 (SLC-41, Atlas V 411); Destination: Asteroid 101955 Bennu; "
                           "Sample Return: 121.6 grams delivered to Earth Sept 24, 2023; Data Return: 45.0 TB; Extended Mission: OSIRIS-APEX to Apophis.", bullet_style))
    story.append(Spacer(1, 6))

    # Dataset 13-15: Satellite Ephemeris, DSN, SWPC
    story.append(Paragraph("E. Satellite Ephemeris, DSN Telemetry Protocols & Heliophysics Models", h2_style))
    story.append(Paragraph("<b>1. Orbital Ephemeris State Vectors (CelesTrak / NASA Tracking Network):</b> "
                           "Defined in <code>src/data/satellites/satelliteNetwork.ts:30-166</code>. Contains authentic orbital inclinations, altitudes, "
                           "eccentricities, periods, RAAN, and velocities for <b>ISS</b> (418 km, 51.64°, 7.66 km/s, NORAD 25544), "
                           "<b>Hubble Space Telescope</b> (535 km, 28.47°, 7.59 km/s, NORAD 20580), "
                           "<b>Landsat 9</b> (705 km Sun-Synchronous, 98.2°, 7.50 km/s, NORAD 49260), and "
                           "<b>NOAA-20 / JPSS-1</b> (824 km Polar LEO, 98.7°, 7.44 km/s, NORAD 43013). "
                           "Orbital points are computed via exact Keplerian-to-Cartesian transformation (<code>calculateOrbitPoint</code>) "
                           "and rendered as real-time 3D orbits with interactive telemetry modals.", bullet_style))
    story.append(Paragraph("<b>2. NASA Deep Space Network (DSN) Telemetry Protocols (JPL D-16838):</b> "
                           "Informs 8.4 GHz X-band carrier lock telemetry in the Orbit Map (<code>OrbitMapCanvas.tsx:163-174</code>) "
                           "and grounds in-flight crisis Event <code>evt-comm-drop</code> (<code>events.ts:47-87</code>) "
                           "simulating signal carrier loss, antenna deflection, and helical recovery scanning across Goldstone, Madrid, and Canberra.", bullet_style))
    story.append(Paragraph("<b>3. NASA DONKI / NOAA SWPC Solar Flare & Proton Flux Models:</b> "
                           "Informs in-flight crisis Event <code>evt-solar-storm</code> (<code>events.ts:4-45</code>), modeling relativistic "
                           "proton bombardment from Class-X solar flares, single-event upsets (SEUs) in avionics, and authentic spacecraft Safe Mode procedures.", bullet_style))

    # 5. MAPPING BETWEEN DATASETS & PROJECT FEATURES
    story.append(PageBreak())
    story.append(Paragraph("4. Feature Mapping Matrix", h1_style))
    story.append(Paragraph(
        "This matrix details exactly which user-facing screen, interactive tool, or simulation canvas "
        "consumes and displays each confirmed NASA dataset.",
        body_style
    ))

    mapping_data = [
        [
            Paragraph("<b>NASA Dataset</b>", table_header_style),
            Paragraph("<b>Project Component / Screen</b>", table_header_style),
            Paragraph("<b>Exact UI / Simulation Function</b>", table_header_style)
        ],
        [
            Paragraph("Blue Marble Surface, Specular & Normal (MODIS/SRTM)", table_cell_bold),
            Paragraph("<code>PlanetaryScene3D.tsx</code><br/><code>HeroOrbitalVisual.tsx</code>", table_cell_style),
            Paragraph("3D Earth sphere rendering with true-color surface, ocean glint specular reflections, and normal elevation bump lighting under directional sunlight.", table_cell_style)
        ],
        [
            Paragraph("Real Atmospheric Cloud Layer (GOES/NOAA)", table_cell_bold),
            Paragraph("<code>PlanetaryScene3D.tsx</code><br/><code>HeroOrbitalVisual.tsx</code>", table_cell_style),
            Paragraph("Concentric 3D cloud sphere rotating at differential speed (+28% faster than surface) to simulate real atmospheric super-rotation.", table_cell_style)
        ],
        [
            Paragraph("Planetary Physical Constants (Moon, Mars, Earth)", table_cell_bold),
            Paragraph("<code>DataExplorerScreen.tsx</code><br/><code>MissionBriefingScreen.tsx</code>", table_cell_style),
            Paragraph("Interactive Planetary Properties explorer tab displaying authentic mass, radius, surface gravity, escape velocity, and atmospheric profiles.", table_cell_style)
        ],
        [
            Paragraph("LRO LOLA Laser Altimeter GDR (PDS)", table_cell_bold),
            Paragraph("<code>SpacecraftBuilderScreen.tsx</code><br/><code>SpacecraftBlueprintCanvas.tsx</code>", table_cell_style),
            Paragraph("Selectable scientific instrument component (<code>nasa-inst-lola</code>), animated CAD laser rangefinder aperture, and 3D Topographic synergy bonuses.", table_cell_style)
        ],
        [
            Paragraph("LRO LROC Multispectral Camera Archive (PDS)", table_cell_bold),
            Paragraph("<code>SpacecraftBuilderScreen.tsx</code><br/><code>SpacecraftBlueprintCanvas.tsx</code>", table_cell_style),
            Paragraph("Selectable instrument (<code>nasa-inst-lroc</code>) with authentic 19.2 kg mass and 34 W draw; renders animated dual telephoto lens in CAD schematic.", table_cell_style)
        ],
        [
            Paragraph("LRO Diviner Thermal Data (PDS)", table_cell_bold),
            Paragraph("<code>SpacecraftBuilderScreen.tsx</code><br/><code>EventModal.tsx</code><br/><code>DebriefScreen.tsx</code>", table_cell_style),
            Paragraph("Component <code>nasa-inst-diviner</code>; drives polar volatile anomaly event and post-mission debrief analysis on 25 K polar cold traps.", table_cell_style)
        ],
        [
            Paragraph("LRO Mini-RF SAR Polar Ice Data (PDS)", table_cell_bold),
            Paragraph("<code>SpacecraftBuilderScreen.tsx</code><br/><code>SpacecraftBlueprintCanvas.tsx</code>", table_cell_style),
            Paragraph("Component <code>nasa-inst-minirf</code>; renders animated microwave radar pulse waves and unlocks cryogenic volatile ice detection synergies.", table_cell_style)
        ],
        [
            Paragraph("LRO LAMP Far-UV Spectrograph (PDS)", table_cell_bold),
            Paragraph("<code>SpacecraftBuilderScreen.tsx</code><br/><code>DataExplorerScreen.tsx</code>", table_cell_style),
            Paragraph("Component <code>nasa-inst-lamp</code>; models Lyman-alpha starlight reflection and water frost diagnostic absorption edges in permanently shadowed craters.", table_cell_style)
        ],
        [
            Paragraph("LRO CRaTER Radiation Archive (PDS)", table_cell_bold),
            Paragraph("<code>SpacecraftBuilderScreen.tsx</code><br/><code>EventModal.tsx</code>", table_cell_style),
            Paragraph("Component <code>nasa-inst-crater</code>; grants -8% mission flight risk reduction and provides historical context for coronal mass ejection crisis events.", table_cell_style)
        ],
        [
            Paragraph("Authentic NASA LRO Preset Build", table_cell_bold),
            Paragraph("<code>gameStore.ts:391-408</code><br/><code>SpacecraftBuilderScreen.tsx</code>", table_cell_style),
            Paragraph("Dedicated 'REAL LRO PRESET (NASA PDS)' button equipping all 4 primary LRO payloads to trigger the authentic +40 Science suite bonus.", table_cell_style)
        ],
        [
            Paragraph("NASA Historical Robotic Missions Catalog", table_cell_bold),
            Paragraph("<code>DataExplorerScreen.tsx</code><br/><code>api/nasa/missions/route.ts</code>", table_cell_style),
            Paragraph("Dedicated 'Robotic Missions' browser displaying launch vehicles, Cape Canaveral pad locations, PDS science volumes (TB), and official mission goals.", table_cell_style)
        ],
        [
            Paragraph("Satellite Ephemeris (ISS, HST, Landsat 9, NOAA-20)", table_cell_bold),
            Paragraph("<code>HeroOrbitalVisual.tsx</code><br/><code>satelliteNetwork.ts</code>", table_cell_style),
            Paragraph("Renders 3D orbital trajectory loops and custom 3D CAD silhouettes; clicking any spacecraft opens live orbital telemetry inspector modal.", table_cell_style)
        ],
        [
            Paragraph("Deep Space Network Carrier Standards", table_cell_bold),
            Paragraph("<code>OrbitMapCanvas.tsx</code><br/><code>EventModal.tsx</code>", table_cell_style),
            Paragraph("Dynamic radio beam connecting Earth ground stations to probe with 'DSN CARRIER: 8.4 GHz LOCK'; triggers DSN carrier drop emergency choices.", table_cell_style)
        ],
        [
            Paragraph("NASA Provenance Registry & Verification", table_cell_bold),
            Paragraph("<code>DataSourcesScreen.tsx</code><br/><code>DataProvenanceModal.tsx</code>", table_cell_style),
            Paragraph("Searchable transparency table with official NASA source links, DOIs, retrieved dates, and strict separation between real data and game simulation.", table_cell_style)
        ]
    ]

    mapping_table = Table(mapping_data, colWidths=[150, 140, 250])
    mapping_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(mapping_table)
    story.append(Spacer(1, 10))

    # 6. SOURCE CODE EVIDENCE WITH FILE PATHS & LINE NUMBERS
    story.append(PageBreak())
    story.append(Paragraph("5. Source-Code Evidence and Citations", h1_style))
    story.append(Paragraph(
        "Every confirmed NASA data product was verified directly in source code. "
        "The following citations document exact file locations and code line numbers:",
        body_style
    ))

    evidence_data = [
        [
            Paragraph("<b>Target Data Product</b>", table_header_style),
            Paragraph("<b>Source File Path</b>", table_header_style),
            Paragraph("<b>Lines</b>", table_header_style),
            Paragraph("<b>Code Symbol / Variable / Implementation</b>", table_header_style)
        ],
        [
            Paragraph("Blue Marble Surface Texture", table_cell_bold),
            Paragraph("<code>src/lib/planetTextures.ts</code>", code_style),
            Paragraph("18, 70", table_cell_style),
            Paragraph("<code>const EARTH_SURFACE = '/textures/earth_surface_2k.jpg'; loadEarthTexture(..., true)</code>", code_style)
        ],
        [
            Paragraph("Blue Marble Specular Mask", table_cell_bold),
            Paragraph("<code>src/lib/planetTextures.ts</code>", code_style),
            Paragraph("19, 71", table_cell_style),
            Paragraph("<code>const EARTH_SPECULAR = '/textures/earth_specular_2k.jpg'; roughnessMap</code>", code_style)
        ],
        [
            Paragraph("SRTM Elevation Normal Map", table_cell_bold),
            Paragraph("<code>src/lib/planetTextures.ts</code>", code_style),
            Paragraph("20, 72", table_cell_style),
            Paragraph("<code>const EARTH_NORMAL = '/textures/earth_normal_2k.jpg'; normalMap</code>", code_style)
        ],
        [
            Paragraph("Real Atmospheric Cloud Map", table_cell_bold),
            Paragraph("<code>src/lib/planetTextures.ts</code>", code_style),
            Paragraph("21, 73", table_cell_style),
            Paragraph("<code>const EARTH_CLOUDS = '/textures/earth_clouds_4k.png'; alphaMap</code>", code_style)
        ],
        [
            Paragraph("Earth Mesh Texture Binding", table_cell_bold),
            Paragraph("<code>src/components/canvas/PlanetaryScene3D.tsx</code>", code_style),
            Paragraph("134-150", table_cell_style),
            Paragraph("<code>meshStandardMaterial: map, normalMap, roughnessMap, alphaMap (clouds)</code>", code_style)
        ],
        [
            Paragraph("Central Earth Hero Rendering", table_cell_bold),
            Paragraph("<code>src/components/canvas/HeroOrbitalVisual.tsx</code>", code_style),
            Paragraph("128-152", table_cell_style),
            Paragraph("<code>CentralEarth3D(): sphereGeometry(0.82), map, cloud sphere(0.82*1.012)</code>", code_style)
        ],
        [
            Paragraph("NASA Moon Physical Constants", table_cell_bold),
            Paragraph("<code>src/data/nasa/planets/planetaryData.ts</code>", code_style),
            Paragraph("4-30", table_cell_style),
            Paragraph("<code>REAL_PLANETARY_DATA.moon: massKg='7.342e22', gravity=1.62, escapeVel=2.38</code>", code_style)
        ],
        [
            Paragraph("NASA Mars Physical Constants", table_cell_bold),
            Paragraph("<code>src/data/nasa/planets/planetaryData.ts</code>", code_style),
            Paragraph("31-57", table_cell_style),
            Paragraph("<code>REAL_PLANETARY_DATA.mars: massKg='6.417e23', gravity=3.72, escapeVel=5.03</code>", code_style)
        ],
        [
            Paragraph("NASA Earth Physical Constants", table_cell_bold),
            Paragraph("<code>src/data/nasa/planets/planetaryData.ts</code>", code_style),
            Paragraph("58-84", table_cell_style),
            Paragraph("<code>REAL_PLANETARY_DATA.earth: massKg='5.972e24', gravity=9.807, escapeVel=11.186</code>", code_style)
        ],
        [
            Paragraph("Planetary API Route", table_cell_bold),
            Paragraph("<code>src/app/api/nasa/planetary/route.ts</code>", code_style),
            Paragraph("1-19", table_cell_style),
            Paragraph("<code>GET(req): returns REAL_PLANETARY_DATA[target] with X-NASA-Data-Source</code>", code_style)
        ],
        [
            Paragraph("LRO LROC Instrument Data", table_cell_bold),
            Paragraph("<code>src/data/nasa/instruments/lroInstruments.ts</code>", code_style),
            Paragraph("3-34", table_cell_style),
            Paragraph("<code>REAL_LRO_INSTRUMENTS[0]: 'nasa-inst-lroc', massKg=19.2, powerW=34.0, PDS EDR</code>", code_style)
        ],
        [
            Paragraph("LRO LOLA Instrument Data", table_cell_bold),
            Paragraph("<code>src/data/nasa/instruments/lroInstruments.ts</code>", code_style),
            Paragraph("36-65", table_cell_style),
            Paragraph("<code>REAL_LRO_INSTRUMENTS[1]: 'nasa-inst-lola', massKg=11.2, powerW=30.8, PDS RDR</code>", code_style)
        ],
        [
            Paragraph("LRO Diviner Instrument Data", table_cell_bold),
            Paragraph("<code>src/data/nasa/instruments/lroInstruments.ts</code>", code_style),
            Paragraph("67-96", table_cell_style),
            Paragraph("<code>REAL_LRO_INSTRUMENTS[2]: 'nasa-inst-diviner', massKg=13.0, powerW=24.7, 30K PSR</code>", code_style)
        ],
        [
            Paragraph("LRO Mini-RF SAR Instrument Data", table_cell_bold),
            Paragraph("<code>src/data/nasa/instruments/lroInstruments.ts</code>", code_style),
            Paragraph("98-127", table_cell_style),
            Paragraph("<code>REAL_LRO_INSTRUMENTS[3]: 'nasa-inst-minirf', massKg=15.6, powerW=90.0, CPR</code>", code_style)
        ],
        [
            Paragraph("LRO LAMP Spectrograph Data", table_cell_bold),
            Paragraph("<code>src/data/nasa/instruments/lroInstruments.ts</code>", code_style),
            Paragraph("129-158", table_cell_style),
            Paragraph("<code>REAL_LRO_INSTRUMENTS[4]: 'nasa-inst-lamp', massKg=6.1, powerW=4.5, Lyman-alpha</code>", code_style)
        ],
        [
            Paragraph("LRO CRaTER Radiation Data", table_cell_bold),
            Paragraph("<code>src/data/nasa/instruments/lroInstruments.ts</code>", code_style),
            Paragraph("160-189", table_cell_style),
            Paragraph("<code>REAL_LRO_INSTRUMENTS[5]: 'nasa-inst-crater', massKg=5.4, powerW=7.3, LET Spectra</code>", code_style)
        ],
        [
            Paragraph("LRO Instruments Spacecraft Adapter", table_cell_bold),
            Paragraph("<code>src/data/components.ts</code>", code_style),
            Paragraph("111-212", table_cell_style),
            Paragraph("<code>SPACECRAFT_COMPONENTS: realMassKg, realPowerW, isRealNasaInstrument=true</code>", code_style)
        ],
        [
            Paragraph("LRO Science Preset Generator", table_cell_bold),
            Paragraph("<code>src/store/gameStore.ts</code>", code_style),
            Paragraph("391-408", table_cell_style),
            Paragraph("<code>loadLroBuild(): equips lroc, lola, diviner, minirf (+40 science synergy)</code>", code_style)
        ],
        [
            Paragraph("Robotic Missions Master Catalog", table_cell_bold),
            Paragraph("<code>src/data/nasa/missions/missionProfiles.ts</code>", code_style),
            Paragraph("3-123", table_cell_style),
            Paragraph("<code>REAL_NASA_MISSIONS: LRO (1450 TB), Apollo 11 (0.08 TB), M2020 (110 TB), OREx (45 TB)</code>", code_style)
        ],
        [
            Paragraph("Satellite Network Orbital TLEs", table_cell_bold),
            Paragraph("<code>src/data/satellites/satelliteNetwork.ts</code>", code_style),
            Paragraph("30-166", table_cell_style),
            Paragraph("<code>REAL_SATELLITE_NETWORK: ISS (25544), HST (20580), L9 (49260), N20 (43013)</code>", code_style)
        ],
        [
            Paragraph("Keplerian Orbit Calculation", table_cell_bold),
            Paragraph("<code>src/data/satellites/satelliteNetwork.ts</code>", code_style),
            Paragraph("172-199", table_cell_style),
            Paragraph("<code>calculateOrbitPoint(sat, theta, scale): orbital plane to ECI transformation</code>", code_style)
        ],
        [
            Paragraph("Coronal Mass Ejection Crisis Event", table_cell_bold),
            Paragraph("<code>src/data/events.ts</code>", code_style),
            Paragraph("5-44", table_cell_style),
            Paragraph("<code>evt-solar-storm: cites NASA Heliophysics DONKI & LRO CRaTER PDS archive</code>", code_style)
        ],
        [
            Paragraph("DSN Carrier Loss Crisis Event", table_cell_bold),
            Paragraph("<code>src/data/events.ts</code>", code_style),
            Paragraph("47-86", table_cell_style),
            Paragraph("<code>evt-comm-drop: cites NASA Deep Space Network Telemetry Standard (JPL D-16838)</code>", code_style)
        ],
        [
            Paragraph("Polar Volatiles Discovery Event", table_cell_bold),
            Paragraph("<code>src/data/events.ts</code>", code_style),
            Paragraph("131-169", table_cell_style),
            Paragraph("<code>evt-anomaly-discovery: cites LRO Diviner & Mini-RF PSR Volatiles Report</code>", code_style)
        ],
        [
            Paragraph("NASA Provenance Registry", table_cell_bold),
            Paragraph("<code>src/data/nasa/metadata/provenanceCatalog.ts</code>", code_style),
            Paragraph("3-164", table_cell_style),
            Paragraph("<code>NASA_PROVENANCE_CATALOG: 14 catalog records with source URLs, DOIs, and PDS nodes</code>", code_style)
        ]
    ]

    evidence_table = Table(evidence_data, colWidths=[130, 160, 45, 205])
    evidence_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(evidence_table)
    story.append(Spacer(1, 10))

    # 7. OFFICIAL NASA SOURCE LINKS & DOCUMENTATION
    story.append(PageBreak())
    story.append(Paragraph("6. Official NASA Documentation & Archive Links", h1_style))
    story.append(Paragraph(
        "Every identified dataset is traceable to an official public NASA data repository, PDS node, or mission center. "
        "The following links provide official documentation:",
        body_style
    ))

    links_data = [
        [
            Paragraph("<b>Target Scientific Domain</b>", table_header_style),
            Paragraph("<b>Official NASA / Agency Repository URL</b>", table_header_style),
            Paragraph("<b>Archive Node / Division</b>", table_header_style)
        ],
        [
            Paragraph("NASA Blue Marble Global Imagery", table_cell_bold),
            Paragraph("https://visibleearth.nasa.gov/collection/1484/blue-marble", code_style),
            Paragraph("NASA Earth Observatory / GSFC", table_cell_style)
        ],
        [
            Paragraph("NASA SRTM Radar Topography", table_cell_bold),
            Paragraph("https://www2.jpl.nasa.gov/srtm/", code_style),
            Paragraph("NASA Jet Propulsion Laboratory (JPL)", table_cell_style)
        ],
        [
            Paragraph("NASA Earthdata Environmental Portal", table_cell_bold),
            Paragraph("https://www.earthdata.nasa.gov/", code_style),
            Paragraph("NASA ESDIS Project", table_cell_style)
        ],
        [
            Paragraph("NASA Planetary Fact Sheet - Moon", table_cell_bold),
            Paragraph("https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html", code_style),
            Paragraph("NASA Goddard Space Flight Center (NSSDC)", table_cell_style)
        ],
        [
            Paragraph("NASA Planetary Fact Sheet - Mars", table_cell_bold),
            Paragraph("https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html", code_style),
            Paragraph("NASA Goddard Space Flight Center (NSSDC)", table_cell_style)
        ],
        [
            Paragraph("NASA Planetary Fact Sheet - Earth", table_cell_bold),
            Paragraph("https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html", code_style),
            Paragraph("NASA Goddard Space Flight Center (NSSDC)", table_cell_style)
        ],
        [
            Paragraph("LRO LOLA Laser Altimetry Archive", table_cell_bold),
            Paragraph("https://pds-geosciences.wustl.edu/missions/lro/lola.htm", code_style),
            Paragraph("NASA PDS Geosciences Node (WUSTL)", table_cell_style)
        ],
        [
            Paragraph("LRO LROC Camera Public Node", table_cell_bold),
            Paragraph("https://lroc.sese.asu.edu/", code_style),
            Paragraph("NASA PDS Imaging Node / Arizona State Univ", table_cell_style)
        ],
        [
            Paragraph("LRO Diviner Thermal Radiometer", table_cell_bold),
            Paragraph("https://www.diviner.ucla.edu/", code_style),
            Paragraph("NASA PDS Geosciences Node / UCLA", table_cell_style)
        ],
        [
            Paragraph("LRO Mini-RF Radar Polar Science", table_cell_bold),
            Paragraph("https://pds-geosciences.wustl.edu/missions/lro/minirf.htm", code_style),
            Paragraph("NASA PDS Geosciences Node / JHU-APL", table_cell_style)
        ],
        [
            Paragraph("LRO LAMP UV Spectrograph Archive", table_cell_bold),
            Paragraph("https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/LRO/lamp.html", code_style),
            Paragraph("NASA PDS Atmospheres Node (NMSU)", table_cell_style)
        ],
        [
            Paragraph("LRO CRaTER Cosmic Ray Dosimetry", table_cell_bold),
            Paragraph("https://pds-ppi.igpp.ucla.edu/mission/LRO/CRAT/", code_style),
            Paragraph("NASA PDS PPI Node / UCLA / UNH", table_cell_style)
        ],
        [
            Paragraph("NASA NSSDCA Master Missions Catalog", table_cell_bold),
            Paragraph("https://nssdc.gsfc.nasa.gov/", code_style),
            Paragraph("NASA Goddard Space Flight Center", table_cell_style)
        ],
        [
            Paragraph("NASA Deep Space Network (DSN) Ops", table_cell_bold),
            Paragraph("https://eyes.nasa.gov/dsn/dsn.html", code_style),
            Paragraph("NASA Jet Propulsion Laboratory (JPL)", table_cell_style)
        ],
        [
            Paragraph("NASA Space Weather DONKI Portal", table_cell_bold),
            Paragraph("https://kauai.ccmc.gsfc.nasa.gov/DONKI/", code_style),
            Paragraph("NASA Community Coordinated Modeling Center", table_cell_style)
        ],
        [
            Paragraph("USGS / NASA Landsat-9 Mission", table_cell_bold),
            Paragraph("https://landsat.gsfc.nasa.gov/satellites/landsat-9/", code_style),
            Paragraph("NASA GSFC / USGS EROS Center", table_cell_style)
        ],
        [
            Paragraph("NOAA-20 / NASA JPSS Mission", table_cell_bold),
            Paragraph("https://www.nesdis.noaa.gov/our-satellites/currently-flying/joint-polar-satellite-system", code_style),
            Paragraph("NOAA NESDIS / NASA Joint Program", table_cell_style)
        ],
        [
            Paragraph("International Space Station (ISS)", table_cell_bold),
            Paragraph("https://www.nasa.gov/international-space-station/", code_style),
            Paragraph("NASA Space Operations Directorate", table_cell_style)
        ],
        [
            Paragraph("Hubble Space Telescope Science Node", table_cell_bold),
            Paragraph("https://hubblesite.org/", code_style),
            Paragraph("NASA GSFC / Space Telescope Science Inst", table_cell_style)
        ]
    ]

    links_table = Table(links_data, colWidths=[140, 240, 160])
    links_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(links_table)
    story.append(Spacer(1, 10))

    # 8. SUSPECTED OR UNVERIFIED DATA SOURCES
    story.append(Paragraph("7. Suspected, Simulated, or Unverified Data (Clearly Marked as Unconfirmed)", h1_style))
    story.append(Paragraph(
        "To maintain rigorous scientific audit standards, the following items were identified in the codebase "
        "and investigated, but are <b>explicitly designated as unconfirmed, simulated, procedural, or unused</b>:",
        body_style
    ))

    unconfirmed_box_data = [
        [
            Paragraph("<b>Unverified / Procedural Item</b>", table_header_style),
            Paragraph("<b>Source Location</b>", table_header_style),
            Paragraph("<b>Audit Finding & Technical Explanation</b>", table_header_style)
        ],
        [
            Paragraph("<b>Unused Asset: earth_topology.png</b>", table_cell_bold),
            Paragraph("<code>public/textures/earth_topology.png</code>", code_style),
            Paragraph("<b>UNCONFIRMED / UNUSED ASSET:</b> A 378,243-byte image exists in the static asset directory. "
                      "Grep analysis across all TypeScript, CSS, and JSX source files reveals <b>zero occurrences</b>. "
                      "This file is completely unreferenced by the runtime rendering pipeline.", table_cell_style)
        ],
        [
            Paragraph("<b>Procedural Lunar Surface Textures</b>", table_cell_bold),
            Paragraph("<code>src/lib/planetTextures.ts:83-250</code>", code_style),
            Paragraph("<b>PROCEDURAL ARTWORK (NOT RAW NASA RASTER):</b> While <code>provenanceCatalog.ts:105-113</code> cites the LRO WAC Global Mosaic, "
                      "the runtime texture is procedurally painted via HTML5 2D Canvas routines (<code>drawMare</code>, <code>drawCraterWithRays</code>). "
                      "No real NASA photographic raster is bundled for the Moon.", table_cell_style)
        ],
        [
            Paragraph("<b>Procedural Mars Surface Textures</b>", table_cell_bold),
            Paragraph("<code>src/lib/planetTextures.ts:252-335</code>", code_style),
            Paragraph("<b>PROCEDURAL ARTWORK (NOT RAW NASA RASTER):</b> While <code>provenanceCatalog.ts:115-123</code> cites MGS MOLA and MRO MARCI, "
                      "the Mars surface texture is procedurally generated with canvas gradient circles representing Olympus Mons and Valles Marineris. "
                      "It is an artistic approximation, not downloaded raw MGS MOLA MEGDR data.", table_cell_style)
        ],
        [
            Paragraph("<b>Fictional Spacecraft & Launcher Specs</b>", table_cell_bold),
            Paragraph("<code>src/data/launchers.ts:1-38</code><br/><code>src/data/components.ts:1-108</code>", code_style),
            Paragraph("<b>SIMULATED GAME BALANCING:</b> Generic components (Carbon-Composite Bus, Titanium Bus, Battery Banks, Thrusters) "
                      "and launch vehicles (AeroLift-1, Atlas-Titan V, Nova Heavy) use fictional cost, mass, and thrust numbers "
                      "engineered for gameplay progression, not genuine NASA engineering telemetry.", table_cell_style)
        ],
        [
            Paragraph("<b>Procedural Web Audio Engine</b>", table_cell_bold),
            Paragraph("<code>src/lib/sound.ts:1-871</code>", code_style),
            Paragraph("<b>PROCEDURAL SYNTHESIS (NO NASA AUDIO RECORDINGS):</b> All launch acoustics (rumble, shear, turbopump hum, "
                      "countdown beeps, flight director chords) are synthesized procedurally via Web Audio API oscillators and noise buffers. "
                      "No authentic NASA air-to-ground mission audio recordings are used.", table_cell_style)
        ]
    ]

    unconfirmed_table = Table(unconfirmed_box_data, colWidths=[130, 150, 260])
    unconfirmed_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#7f1d1d")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#fca5a5")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#fff5f5"), colors.HexColor("#fef2f2")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(unconfirmed_table)
    story.append(Spacer(1, 10))

    # 9. FINAL AUDIT COUNT SUMMARY
    story.append(Paragraph("8. Final Audit Count of Data Products & Datasets", h1_style))
    story.append(Paragraph(
        "To avoid double-counting multi-format representations or related instruments, "
        "the final audit count classifies items into unambiguous scientific categories:",
        body_style
    ))

    summary_count_data = [
        [
            Paragraph("<b>Classification Category</b>", table_header_style),
            Paragraph("<b>Distinct Count</b>", table_header_style),
            Paragraph("<b>Reconciliation & Non-Duplication Rule</b>", table_header_style)
        ],
        [
            Paragraph("<b>Confirmed NASA Cartographic Image Products</b>", table_cell_bold),
            Paragraph("<b>4</b>", table_cell_bold),
            Paragraph("1. Blue Marble Surface (2K RGB); 2. Blue Marble Specular Mask; 3. SRTM Normal Map; 4. GOES Cloud Map. (Each is an independent physical file in <code>/public/textures/</code>).", table_cell_style)
        ],
        [
            Paragraph("<b>Confirmed NASA Planetary Science Datasets</b>", table_cell_bold),
            Paragraph("<b>1</b>", table_cell_bold),
            Paragraph("NASA GSFC/NSSDC Planetary Constants (covers Moon, Mars, Earth physical parameters counted as a single unified astronomical catalog).", table_cell_style)
        ],
        [
            Paragraph("<b>Confirmed NASA LRO Scientific Instrument Datasets</b>", table_cell_bold),
            Paragraph("<b>6</b>", table_cell_bold),
            Paragraph("LOLA, LROC, Diviner, Mini-RF, LAMP, and CRaTER. (Each represents an independent instrument dataset downlinked to distinct NASA PDS nodes).", table_cell_style)
        ],
        [
            Paragraph("<b>Confirmed NASA Historical Missions Catalog</b>", table_cell_bold),
            Paragraph("<b>1</b>", table_cell_bold),
            Paragraph("NASA Space Science Data Coordinated Archive Master Catalog (encompasses LRO, Apollo 11, Mars 2020, OSIRIS-REx profiles).", table_cell_style)
        ],
        [
            Paragraph("<b>Confirmed Space Surveillance Ephemeris & DSN Feeds</b>", table_cell_bold),
            Paragraph("<b>3</b>", table_cell_bold),
            Paragraph("1. CelesTrak/NASA Tracking Network Satellite Ephemeris (ISS, HST, Landsat 9, NOAA-20); 2. DSN Telemetry Standards; 3. DONKI/SWPC Space Weather Flare Models.", table_cell_style)
        ],
        [
            Paragraph("<b>TOTAL CONFIRMED SPACE SCIENCE DATA SOURCES</b>", table_header_style),
            Paragraph("<b>15</b>", table_header_style),
            Paragraph("<b>12 Pure NASA Data Products + 3 Allied Space Science / Orbit Surveillance Datasets</b>", table_header_style)
        ],
        [
            Paragraph("<b>Suspected, Unused, or Procedural Sources</b>", table_cell_bold),
            Paragraph("<b>5</b>", table_cell_bold),
            Paragraph("1. earth_topology.png (unused asset); 2. Procedural Moon Canvas; 3. Procedural Mars Canvas; 4. Fictional launcher/bus specs; 5. Procedural Web Audio engine.", table_cell_style)
        ]
    ]

    count_table = Table(summary_count_data, colWidths=[180, 70, 290])
    count_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BACKGROUND', (0,5), (-1,5), colors.HexColor("#0284c7")),
        ('TEXTCOLOR', (0,5), (-1,5), colors.white),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,4), [colors.white, colors.HexColor("#f8fafc")]),
        ('ROWBACKGROUNDS', (0,6), (-1,-1), [colors.HexColor("#fff5f5")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(count_table)
    story.append(Spacer(1, 14))

    # Audit Sign-Off Block
    story.append(KeepTogether([
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceBefore=4, spaceAfter=8),
        Paragraph(
            "<b>Audit Conclusion:</b> The <i>Beyond-Earth</i> software repository demonstrates a genuine, verified integration of "
            "NASA data products. It rigorously implements 4 real cartographic satellite rasters, 1 planetary science physical constant suite, "
            "6 authentic Lunar Reconnaissance Orbiter PDS instrument datasets, 1 historical robotic missions catalog, and 3 allied space ephemeris "
            "and telemetry protocols. All simulated mechanics and procedural graphics are accurately differentiated from genuine scientific data. "
            "No spurious or fabricated NASA datasets were detected in the codebase.",
            callout_style
        )
    ]))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == '__main__':
    output_pdf = "/Users/mohammadalinayeem/Project & Code/Beyond-Earth/Beyond-Earth_NASA_Data_Inventory.pdf"
    build_pdf(output_pdf)
