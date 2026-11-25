export interface Grade7ChapterRef {
  id: string;
  subject: string;
  chapterNumber: number;
  title: string;
  textbook: string;
  publisher: string;
  pageRange: string;
  ncseBridge: string;
  summary: string;
  keyConcepts: string[];
  formulasOrFacts: string[];
  commonMisconceptions: string[];
  keywords: string[];
  studentPrompt: string;
  teacherPrompt: string;
}

export interface Grade7TextbookBookMeta {
  subject: string;
  primaryBook: string;
  publisher: string;
  ncseReference: string;
  chapters: Grade7ChapterRef[];
}

export interface TextbookSearchMatch {
  id: string;
  subject: string;
  chapterNumber: number;
  title: string;
  textbook: string;
  publisher: string;
  pageRange: string;
  ncseBridge: string;
  summary: string;
  keyConcepts: string[];
  formulasOrFacts: string[];
  score: number;
}

export const GRADE_7_TEXTBOOK_CATALOG: Grade7ChapterRef[] = [
  // =========================================================================
  // MATHEMATICS — ICSE Understanding Mathematics by M.L. Aggarwal (Arya Publications)
  // =========================================================================
  {
    id: 'math-ch1-integers',
    subject: 'Mathematics',
    chapterNumber: 1,
    title: 'Integers & Order of Operations (VBODMAS)',
    textbook: 'ICSE Understanding Mathematics — Class 7 (by M.L. Aggarwal)',
    publisher: 'Arya Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 1–26',
    ncseBridge: 'NCERT Class VII Mathematics — Ch. 1: Integers',
    summary:
      'Number line representation of positive and negative integers, absolute value, properties of addition and multiplication, sign rules for products/quotients, and bracket hierarchy (Vinculum, Round, Curly, Square).',
    keyConcepts: [
      'Closure, Commutative, Associative, and Distributive properties of integers',
      'Sign rules: like signs yield positive, unlike signs yield negative',
      'BODMAS / VBODMAS strict bracket simplification order',
      'Division by zero is undefined; additive identity (0) and multiplicative identity (1)'
    ],
    formulasOrFacts: [
      'a × (b + c) = (a × b) + (a × c)',
      '(-a) × (-b) = +ab  |  (-a) ÷ (+b) = -(a ÷ b)',
      '|x| = x if x ≥ 0, and -x if x < 0'
    ],
    commonMisconceptions: [
      'Multiplying two negative numbers gives a negative result (incorrect: product is positive).',
      'Simplifying addition before division inside mixed expressions without following VBODMAS.'
    ],
    keywords: [
      'integer',
      'integers',
      'bodmas',
      'vbodmas',
      'absolute value',
      'number line',
      'negative',
      'division',
      'divide',
      'multiply',
      'distributive',
      'bracket',
      'aggarwal',
      'agarwal',
      'arya publications'
    ],
    studentPrompt:
      'Guide me step-by-step through the sign rules and VBODMAS bracket hierarchy in Class 7 Integers.',
    teacherPrompt:
      'Design a 40-minute ICSE Class 7 Mathematics lesson plan on Integers & VBODMAS with common error diagnostics.'
  },
  {
    id: 'math-ch2-fractions-rationals',
    subject: 'Mathematics',
    chapterNumber: 2,
    title: 'Fractions, Decimals & Rational Numbers',
    textbook: 'ICSE Understanding Mathematics — Class 7 (by M.L. Aggarwal)',
    publisher: 'Arya Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 27–74',
    ncseBridge: 'NCERT Class VII Mathematics — Ch. 2 & Ch. 8: Fractions, Decimals & Rational Numbers',
    summary:
      'Operations on proper, improper, and mixed fractions; reciprocal division; terminating vs non-terminating decimals; standard form of rational numbers p/q (q ≠ 0).',
    keyConcepts: [
      'Standard form of a rational number has positive denominator and HCF(|p|, q) = 1',
      'Division by a fraction equals multiplication by its multiplicative inverse (reciprocal)',
      'Comparing rational numbers via LCM of denominators or cross-multiplication',
      'Decimal place-value shifts under multiplication and division by powers of 10'
    ],
    formulasOrFacts: [
      '(a/b) ÷ (c/d) = (a/b) × (d/c), where c ≠ 0',
      'Rational number: p/q where p, q ∈ ℤ and q ≠ 0'
    ],
    commonMisconceptions: [
      'Taking the reciprocal of the dividend instead of the divisor during fraction division.',
      'Adding numerators and denominators directly instead of finding the LCM.'
    ],
    keywords: [
      'fraction',
      'fractions',
      'decimal',
      'decimals',
      'rational',
      'reciprocal',
      'numerator',
      'denominator',
      'lcm',
      'hcf',
      'mixed fraction'
    ],
    studentPrompt:
      'Help me understand why dividing by a fraction is the same as multiplying by its reciprocal, using Class 7 ICSE examples.',
    teacherPrompt:
      'Create a Class 7 ICSE Mathematics classroom activity contrasting Fractions and Rational Numbers with step-marking rubric.'
  },
  {
    id: 'math-ch5-exponents',
    subject: 'Mathematics',
    chapterNumber: 5,
    title: 'Exponents & Powers (Laws of Indices)',
    textbook: 'ICSE Understanding Mathematics — Class 7 (by M.L. Aggarwal)',
    publisher: 'Arya Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 91–110',
    ncseBridge: 'NCERT Class VII Mathematics — Ch. 11: Exponents and Powers',
    summary:
      'Exponential notation, prime factorisation into index form, fundamental laws of exponents for integral powers, zero exponent rule, and scientific notation.',
    keyConcepts: [
      'Product law and quotient law apply only when bases are identical',
      'Power of a power multiplies exponents: (a^m)^n = a^(m×n)',
      'Zero exponent identity: a^0 = 1 for any non-zero base a ≠ 0',
      'Standard scientific form: k × 10^n where 1 ≤ k < 10'
    ],
    formulasOrFacts: [
      'a^m × a^n = a^(m+n)',
      'a^m ÷ a^n = a^(m-n)',
      '(a^m)^n = a^(mn)  |  (ab)^m = a^m b^m  |  a^0 = 1 (a ≠ 0)'
    ],
    commonMisconceptions: [
      'Adding exponents when adding terms like 2^3 + 2^3 (the product law only works for multiplication).',
      'Assuming a^0 = 0 instead of 1.'
    ],
    keywords: [
      'exponent',
      'exponents',
      'power',
      'powers',
      'index',
      'indices',
      'scientific notation',
      'square',
      'cube',
      'base'
    ],
    studentPrompt:
      'Explain why any non-zero number raised to the power 0 equals 1 using the ICSE Class 7 Quotient Law of Exponents.',
    teacherPrompt:
      'Build a 40-minute ICSE Class 7 lesson plan on Laws of Exponents with misconception checks.'
  },
  {
    id: 'math-ch9-commercial-arithmetic',
    subject: 'Mathematics',
    chapterNumber: 8,
    title: 'Percentage, Profit & Loss, Discount and Simple Interest',
    textbook: 'ICSE Understanding Mathematics — Class 7 (by M.L. Aggarwal)',
    publisher: 'Arya Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 142–176',
    ncseBridge: 'NCERT Class VII Mathematics — Ch. 7: Comparing Quantities',
    summary:
      'Percentage conversions, percentage increase/decrease, Cost Price (CP), Selling Price (SP), Marked Price & Discount, and Simple Interest calculations.',
    keyConcepts: [
      'Profit % and Loss % are always calculated on Cost Price (CP), never on Selling Price',
      'Discount is always calculated on Marked Price (MP)',
      'Simple Interest relates Principal (P), Rate % per annum (R), and Time in years (T)',
      'Amount (A) = Principal (P) + Simple Interest (SI)'
    ],
    formulasOrFacts: [
      'Profit % = (Profit / CP) × 100  |  Loss % = (Loss / CP) × 100',
      'SI = (P × R × T) / 100  |  Amount = P + SI',
      'SP = MP − Discount'
    ],
    commonMisconceptions: [
      'Dividing profit by Selling Price instead of Cost Price when finding Profit %.',
      'Forgetting to convert time given in months or days into years before applying SI = PRT/100.'
    ],
    keywords: [
      'percentage',
      'percentage and its applications',
      'applications of percentage',
      'percent',
      'profit',
      'loss',
      'simple interest',
      'discount',
      'cost price',
      'selling price',
      'marked price',
      'ratio',
      'proportion',
      'unitary'
    ],
    studentPrompt:
      'Explain why Profit % is always calculated on Cost Price and how Simple Interest depends on Principal, Rate, and Time.',
    teacherPrompt:
      'Design an ICSE Class 7 real-world commercial arithmetic workshop covering Profit, Loss, Discount, and Simple Interest.'
  },
  {
    id: 'math-ch12-linear-equations',
    subject: 'Mathematics',
    chapterNumber: 11,
    title: 'Algebraic Expressions & Simple Linear Equations',
    textbook: 'ICSE Understanding Mathematics — Class 7 (by M.L. Aggarwal)',
    publisher: 'Arya Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 188–224',
    ncseBridge: 'NCERT Class VII Mathematics — Ch. 4 & Ch. 10: Simple Equations & Algebraic Expressions',
    summary:
      'Like and unlike terms, degree of polynomials, addition/subtraction of algebraic expressions, balance method and transposition for linear equations in one variable.',
    keyConcepts: [
      'An equation is a mathematical balance: identical operations on LHS and RHS preserve equality',
      'Transposition moves a term across the equals sign by inverting its operation',
      'Only like terms (same variables with identical powers) can be combined',
      'Always verify the root by substituting back into the original LHS and RHS'
    ],
    formulasOrFacts: [
      'ax + b = c  ⇒  ax = c − b  ⇒  x = (c − b) / a  (a ≠ 0)',
      'Verification: Check LHS(x) = RHS(x)'
    ],
    commonMisconceptions: [
      'Changing the sign of a multiplier when dividing both sides instead of keeping its sign.',
      'Combining unlike terms such as 3x + 4 into 7x.'
    ],
    keywords: [
      'algebra',
      'algebraic',
      'equation',
      'equations',
      'linear',
      'variable',
      'transpose',
      'transposition',
      'solve',
      'polynomial',
      'like terms',
      'coefficient'
    ],
    studentPrompt:
      'Explain the balance principle behind transposition in ICSE Class 7 Linear Equations without skipping why signs change.',
    teacherPrompt:
      'Prepare a 40-minute Class 7 ICSE lesson plan on translating word problems into Linear Equations.'
  },
  {
    id: 'math-ch16-triangles-congruence',
    subject: 'Mathematics',
    chapterNumber: 15,
    title: 'Triangles, Pythagoras Theorem & Congruence',
    textbook: 'ICSE Understanding Mathematics — Class 7 (by M.L. Aggarwal)',
    publisher: 'Arya Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 256–294',
    ncseBridge: 'NCERT Class VII Mathematics — Ch. 6: The Triangle and its Properties (+ Congruence)',
    summary:
      'Angle Sum Property (180°), Exterior Angle Theorem, Triangle Inequality, Pythagoras Theorem for right-angled triangles, and the four congruence criteria (SSS, SAS, ASA, RHS).',
    keyConcepts: [
      'Interior angle sum of any Euclidean triangle equals 180°',
      'Exterior angle equals the sum of the two interior opposite angles',
      'Congruence criteria: SSS, SAS (included angle), ASA/AAS, and RHS (right triangle)',
      'AAA guarantees similarity (same shape), NOT congruence (same size)'
    ],
    formulasOrFacts: [
      '∠A + ∠B + ∠C = 180°',
      'Hypotenuse² = Base² + Perpendicular²  (c² = a² + b²)',
      'Triangle Inequality: a + b > c for any two sides a, b'
    ],
    commonMisconceptions: [
      'Using SAS when the equal angle is not strictly included between the two equal sides.',
      'Thinking AAA proves two triangles are congruent.'
    ],
    keywords: [
      'triangle',
      'triangles',
      'congruence',
      'congruent',
      'sss',
      'sas',
      'asa',
      'rhs',
      'pythagoras',
      'hypotenuse',
      'exterior angle',
      'angle sum',
      'cpctc',
      'geometry',
      'mensuration',
      'area',
      'perimeter'
    ],
    studentPrompt:
      'Explain why SAS requires the included angle and why AAA cannot prove congruence in ICSE Class 7 Geometry.',
    teacherPrompt:
      'Create a geometric discovery lesson plan for ICSE Class 7 Congruence of Triangles (SSS, SAS, ASA, RHS).'
  },

  // =========================================================================
  // PHYSICS — Srijan ICSE Physics - 7 by S.C. Gupta (Srijan Publication Pvt. Ltd.)
  // =========================================================================
  {
    id: 'phys-ch1-measurement',
    subject: 'Physics',
    chapterNumber: 1,
    title: 'Physical Quantities & Measurement',
    textbook: 'Srijan ICSE Physics — Class 7 (by S.C. Gupta)',
    publisher: 'Srijan Publication Pvt. Ltd. (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 1–24',
    ncseBridge: 'NCERT Class VII Science — Measurement & Units Foundation',
    summary:
      'Volume of regular and irregular solids (displacement method), area estimation using graph paper, density and relative density, and SI unit conversions.',
    keyConcepts: [
      'Density is mass per unit volume; it is a characteristic property of a pure substance',
      'Irregular solid volume is measured via water displacement in a measuring cylinder or Eureka can',
      'Speed is distance travelled per unit time; SI unit is m/s',
      '1 g/cm³ = 1000 kg/m³ and 1 m/s = 3.6 km/h'
    ],
    formulasOrFacts: [
      'Density (ρ) = Mass (m) / Volume (V)  [SI unit: kg/m³]',
      'Speed (v) = Distance (d) / Time (t)  [SI unit: m/s]',
      '1 km/h = 5/18 m/s'
    ],
    commonMisconceptions: [
      'Confusing mass (kg) with weight (N) or thinking a larger piece of iron has higher density than a smaller piece.',
      'Forgetting to convert cm³ to m³ or km/h to m/s when using SI units.'
    ],
    keywords: [
      'density',
      'volume',
      'measurement',
      'eureka',
      'displacement',
      'si unit',
      'mass',
      'area',
      'kg/m3',
      'g/cm3',
      'srijan',
      's.c. gupta'
    ],
    studentPrompt:
      'Explain why density stays the same even if you cut a solid iron block into two unequal pieces.',
    teacherPrompt:
      'Design a 40-minute ICSE Class 7 Physics lab lesson on measuring density of irregular solids using the Eureka can.'
  },
  {
    id: 'phys-ch2-motion',
    subject: 'Physics',
    chapterNumber: 2,
    title: 'Force, Pressure & Motion',
    textbook: 'Srijan ICSE Physics — Class 7 (by S.C. Gupta)',
    publisher: 'Srijan Publication Pvt. Ltd. (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 25–52',
    ncseBridge: 'NCERT Class VII Science — Ch. 9: Motion and Time',
    summary:
      'Relative nature of rest and motion, translatory, rotatory, oscillatory, periodic and random motion, uniform vs non-uniform motion, simple pendulum time period, weight, and distance-time graphs.',
    keyConcepts: [
      'Rest and motion are relative to the chosen observer/reference frame',
      'Uniform motion covers equal distances in equal intervals of time (straight line on d-t graph)',
      'Average speed = Total distance travelled / Total time taken',
      'Time period of a simple pendulum depends on length and gravity, not on bob mass'
    ],
    formulasOrFacts: [
      'Average Speed = Total Distance / Total Time',
      'Time Period (T) = Total time for n oscillations / n',
      'Weight (W) = m × g  (g ≈ 9.8 m/s² or 10 m/s²)  |  Pressure (P) = F / A'
    ],
    commonMisconceptions: [
      'Calculating average speed as the simple mean of two speeds when distances (not times) are equal.',
      'Thinking a heavier pendulum bob swings faster.'
    ],
    keywords: [
      'motion',
      'rest',
      'speed',
      'distance',
      'uniform',
      'non-uniform',
      'pendulum',
      'oscillatory',
      'periodic',
      'rotatory',
      'translatory',
      'average speed',
      'distance-time',
      'velocity',
      'weight',
      'pressure',
      'force',
      'srijan'
    ],
    studentPrompt:
      'Explain why rest and motion are relative and how a distance-time graph distinguishes uniform from non-uniform motion.',
    teacherPrompt:
      'Create an ICSE Class 7 Physics lesson plan on Motion and Distance-Time Graphs with a classroom pendulum demo.'
  },
  {
    id: 'phys-ch5-heat',
    subject: 'Physics',
    chapterNumber: 5,
    title: 'Heat, Temperature & Modes of Heat Transfer',
    textbook: 'Srijan ICSE Physics — Class 7 (by S.C. Gupta)',
    publisher: 'Srijan Publication Pvt. Ltd. (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 78–102',
    ncseBridge: 'NCERT Class VII Science — Ch. 3: Heat',
    summary:
      'Heat as thermal energy vs temperature as degree of hotness, Celsius/Fahrenheit/Kelvin scales, thermal expansion of solids/liquids/gases, conduction, convection, radiation, and thermos flask design.',
    keyConcepts: [
      'Heat is energy in transit (SI unit: Joule); Temperature measures average kinetic energy (SI unit: Kelvin)',
      'Conduction occurs mainly in solids via particle vibrations without bulk movement',
      'Convection occurs in fluids (liquids/gases) via density-driven currents (land & sea breezes)',
      'Radiation transfers heat through vacuum via electromagnetic infrared waves; dark matte surfaces absorb/emit best'
    ],
    formulasOrFacts: [
      'C / 5 = (F − 32) / 9',
      'K = °C + 273.15  (≈ °C + 273 in Class 7)',
      'Clinical thermometer range: 35°C to 42°C (with constriction/kink)'
    ],
    commonMisconceptions: [
      'Thinking heat and temperature are identical quantities.',
      'Assuming convection can happen in solids or through the vacuum of space.'
    ],
    keywords: [
      'heat',
      'temperature',
      'conduction',
      'convection',
      'radiation',
      'thermos',
      'thermometer',
      'celsius',
      'fahrenheit',
      'kelvin',
      'sea breeze',
      'land breeze',
      'expansion',
      'bimetallic'
    ],
    studentPrompt:
      'Compare conduction, convection, and radiation in ICSE Class 7 Physics, and explain how a thermos flask minimises all three.',
    teacherPrompt:
      'Build an ICSE Class 7 Physics lesson plan on Modes of Heat Transfer and Real-World Applications (Sea Breeze & Thermos).'
  },
  {
    id: 'phys-ch4-light-sound-electricity',
    subject: 'Physics',
    chapterNumber: 4,
    title: 'Light Energy, Sound & Electricity and Magnetism',
    textbook: 'Srijan ICSE Physics — Class 7 (by S.C. Gupta)',
    publisher: 'Srijan Publication Pvt. Ltd. (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 53–77 & 103–144',
    ncseBridge: 'NCERT Class VII Science — Ch. 10 & Ch. 11: Electric Current & Light',
    summary:
      'Laws of reflection, plane mirror image properties (virtual, erect, laterally inverted), speed of light, production & propagation of sound (needs medium), electric circuits, series vs parallel, and electromagnets.',
    keyConcepts: [
      'Laws of reflection: ∠i = ∠r, and incident ray, reflected ray, and normal lie in the same plane',
      'Plane mirror image is virtual, erect, same size, equidistant behind mirror, and laterally inverted',
      'Sound is a mechanical longitudinal wave: travels fastest in solids, slower in liquids/gases, zero in vacuum',
      'Electric fuse works on heating effect of current; electromagnets are temporary magnets controlled by current'
    ],
    formulasOrFacts: [
      'Angle of incidence (∠i) = Angle of reflection (∠r)',
      'Speed of light in vacuum: c ≈ 3 × 10⁸ m/s',
      'Speed of sound in air (20°C): ≈ 340 m/s  |  v = d / t (echo: d = vt/2)'
    ],
    commonMisconceptions: [
      'Measuring angle of incidence from the mirror surface instead of from the Normal.',
      'Believing sound can travel through outer space.'
    ],
    keywords: [
      'light',
      'reflection',
      'mirror',
      'lateral inversion',
      'virtual image',
      'sound',
      'echo',
      'frequency',
      'amplitude',
      'pitch',
      'loudness',
      'electricity',
      'circuit',
      'fuse',
      'electromagnet',
      'magnetism'
    ],
    studentPrompt:
      'Why is the angle of incidence always measured from the Normal and not the mirror surface in ICSE Class 7 Light?',
    teacherPrompt:
      'Design a 40-minute ICSE Class 7 Physics lesson on Laws of Reflection and Plane Mirror Ray Diagrams.'
  },

  // =========================================================================
  // CHEMISTRY — Concise Chemistry - 7 (Selina Publications)
  // =========================================================================
  {
    id: 'chem-ch1-matter-changes',
    subject: 'Chemistry',
    chapterNumber: 2,
    title: 'Physical & Chemical Changes and Matter Composition',
    textbook: 'Concise Chemistry — Class 7 (Selina Publications)',
    publisher: 'Selina Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 12–28',
    ncseBridge: 'NCERT Class VII Science — Ch. 5: Physical and Chemical Changes',
    summary:
      'Kinetic molecular theory of solids, liquids, and gases; interconversion of states; physical vs chemical changes; exothermic/endothermic reactions; rusting and galvanisation.',
    keyConcepts: [
      'Physical changes alter form/state without creating a new chemical substance (generally reversible)',
      'Chemical changes form one or more new substances with altered composition and properties',
      'Rusting of iron requires BOTH oxygen (air) and moisture (water); prevented by galvanisation (zinc coating)',
      'Law of Conservation of Mass: total mass of reactants equals total mass of products'
    ],
    formulasOrFacts: [
      'Rusting: 4Fe + 3O₂ + 2xH₂O → 2Fe₂O₃·xH₂O (Hydrated Iron(III) oxide)',
      'Burning of Magnesium: 2Mg + O₂ → 2MgO'
    ],
    commonMisconceptions: [
      'Assuming all physical changes are reversible (tearing paper is physical yet irreversible).',
      'Thinking burning a candle is purely chemical (melting of wax is physical while burning of wax vapour is chemical).'
    ],
    keywords: [
      'physical change',
      'chemical change',
      'rusting',
      'galvanisation',
      'matter',
      'solid',
      'liquid',
      'gas',
      'sublimation',
      'exothermic',
      'endothermic',
      'candle'
    ],
    studentPrompt:
      'Why does a burning candle demonstrate both a physical change and a chemical change in ICSE Class 7 Chemistry?',
    teacherPrompt:
      'Design a Class 7 ICSE Chemistry lesson comparing Physical and Chemical Changes with 3 safe classroom demonstrations.'
  },
  {
    id: 'chem-ch3-elements-compounds-mixtures',
    subject: 'Chemistry',
    chapterNumber: 3,
    title: 'Elements, Compounds, Mixtures & Separation Techniques',
    textbook: 'Concise Chemistry — Class 7 (Selina Publications)',
    publisher: 'Selina Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 29–48',
    ncseBridge: 'NCERT Class VII Science — Substances & Mixtures Foundation',
    summary:
      'Pure substances (elements and compounds) vs homogeneous/heterogeneous mixtures; fixed ratio vs variable composition; filtration, distillation, fractional distillation, separating funnel, chromatography, and sublimation.',
    keyConcepts: [
      'Elements consist of one type of atom; compounds have elements chemically combined in a fixed mass ratio',
      'Mixtures retain individual properties of constituents and can be separated by physical methods',
      'Separating funnel separates immiscible liquids (oil & water); fractional distillation separates miscible liquids with different boiling points',
      'Chromatography separates dissolved pigments based on differential solubility/adsorption'
    ],
    formulasOrFacts: [
      'Water (H₂O) — Compound (fixed 1:8 mass ratio of H:O)',
      'Air — Homogeneous mixture (≈78% N₂, 21% O₂, 0.9% Ar, 0.04% CO₂)'
    ],
    commonMisconceptions: [
      'Calling air a compound instead of a mixture.',
      'Using simple filtration to separate dissolved salt from water (evaporation/distillation is needed).'
    ],
    keywords: [
      'element',
      'compound',
      'mixture',
      'separation',
      'distillation',
      'chromatography',
      'filtration',
      'sublimation',
      'separating funnel',
      'immiscible',
      'miscible',
      'homogeneous',
      'heterogeneous'
    ],
    studentPrompt:
      'Explain how to choose between filtration, separating funnel, distillation, and chromatography in ICSE Class 7 Chemistry.',
    teacherPrompt:
      'Create an ICSE Class 7 Chemistry lab guide on Separation of Mixtures with a decision flowchart.'
  },
  {
    id: 'chem-ch4-atomic-structure-language',
    subject: 'Chemistry',
    chapterNumber: 4,
    title: 'Atomic Structure, Valency & Language of Chemistry',
    textbook: 'Concise Chemistry — Class 7 (Selina Publications)',
    publisher: 'Selina Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 49–68',
    ncseBridge: 'NCERT Middle School Chemistry — Atoms, Symbols & Equations',
    summary:
      'Subatomic particles (protons, neutrons, electrons), atomic number, mass number, chemical symbols, valency, radicals/ions, criss-cross formula writing, and balancing simple chemical equations.',
    keyConcepts: [
      'Atom is electrically neutral: number of protons (+1) equals number of electrons (−1)',
      'Valency is the combining capacity of an element or radical',
      'Criss-cross method balances positive and negative valencies to write neutral chemical formulae',
      'Balancing equations adjusts coefficients (never subscripts!) to satisfy conservation of atoms'
    ],
    formulasOrFacts: [
      'Atomic Number (Z) = Number of protons',
      'Mass Number (A) = Protons + Neutrons',
      'Common radicals: OH⁻ (1), NO₃⁻ (1), SO₄²⁻ (2), CO₃²⁻ (2), NH₄⁺ (1)'
    ],
    commonMisconceptions: [
      'Changing subscripts (like turning H₂O into H₂O₂) while balancing chemical equations.',
      'Confusing atomic number with mass number.'
    ],
    keywords: [
      'atom',
      'atomic',
      'proton',
      'neutron',
      'electron',
      'valency',
      'radical',
      'formula',
      'chemical equation',
      'balancing',
      'symbol',
      'acids',
      'bases',
      'salts',
      'neutralisation',
      'litmus',
      'ph'
    ],
    studentPrompt:
      'Guide me through why we only change coefficients and never subscripts when balancing equations in ICSE Class 7 Chemistry.',
    teacherPrompt:
      'Design a 40-minute ICSE Class 7 lesson on Valency, Radicals, and Criss-Cross Chemical Formula Writing.'
  },

  // =========================================================================
  // BIOLOGY — Learning Elementary Biology - 7 (Goyal Brothers Prakashan)
  // =========================================================================
  {
    id: 'bio-ch1-tissues',
    subject: 'Biology',
    chapterNumber: 1,
    title: 'Plant & Animal Tissues',
    textbook: 'Learning Elementary Biology — Class 7',
    publisher: 'Goyal Brothers Prakashan (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 9–28',
    ncseBridge: 'NCERT Middle School Biology — Cellular Organisation & Tissues',
    summary:
      'Meristematic vs permanent plant tissues (parenchyma, collenchyma, sclerenchyma, xylem, phloem) and four animal tissues (epithelial, connective, muscular, nervous).',
    keyConcepts: [
      'Meristematic tissues divide actively for plant growth (apical, lateral, intercalary)',
      'Xylem conducts water & minerals upward (mostly dead cells); Phloem translocates food bidirectionally (living sieve tubes)',
      'Connective tissues include blood (fluid matrix), bone, cartilage, ligaments, and tendons',
      'Neurons transmit electrical impulses via dendrites → cyton → axon'
    ],
    formulasOrFacts: [
      'Tendon joins Muscle to Bone  |  Ligament joins Bone to Bone',
      'Xylem = Water & Minerals (unidirectional)  |  Phloem = Sucrose/Food (bidirectional)'
    ],
    commonMisconceptions: [
      'Mixing up tendons and ligaments.',
      'Thinking xylem transports food downward from leaves.'
    ],
    keywords: [
      'tissue',
      'tissues',
      'xylem',
      'phloem',
      'meristematic',
      'parenchyma',
      'sclerenchyma',
      'epithelial',
      'connective',
      'neuron',
      'tendon',
      'ligament',
      'muscle',
      'goyal brothers'
    ],
    studentPrompt:
      'Contrast xylem and phloem in ICSE Class 7 Biology and explain how structure matches function in plant vascular tissues.',
    teacherPrompt:
      'Create a Class 7 ICSE Biology microscope observation lesson plan comparing Plant and Animal Tissues.'
  },
  {
    id: 'bio-ch4-photosynthesis-respiration',
    subject: 'Biology',
    chapterNumber: 4,
    title: 'Photosynthesis & Cellular Respiration',
    textbook: 'Learning Elementary Biology — Class 7',
    publisher: 'Goyal Brothers Prakashan (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 54–82',
    ncseBridge: 'NCERT Class VII Science — Ch. 1 & Ch. 6: Nutrition in Plants & Respiration in Organisms',
    summary:
      'Autotrophic nutrition, chloroplasts, stomata & guard cells, iodine starch test, aerobic vs anaerobic respiration, and gas exchange in plants and humans.',
    keyConcepts: [
      'Photosynthesis converts light energy into chemical energy (glucose) inside chloroplasts using chlorophyll',
      'Stomata regulate gas exchange (CO₂ in, O₂ out) and transpiration via turgid/flaccid guard cells',
      'Aerobic respiration uses oxygen to release high energy (ATP) + CO₂ + H₂O',
      'Plants respire continuously 24 hours a day, whereas photosynthesis occurs only in light'
    ],
    formulasOrFacts: [
      'Photosynthesis: 6CO₂ + 6H₂O —(Sunlight / Chlorophyll)→ C₆H₁₂O₆ + 6O₂',
      'Aerobic Respiration: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + Energy (ATP)'
    ],
    commonMisconceptions: [
      'Believing plants only respire at night (plants respire day and night).',
      'Confusing breathing (physical ventilation) with cellular respiration (biochemical energy release).'
    ],
    keywords: [
      'photosynthesis',
      'chlorophyll',
      'chloroplast',
      'stomata',
      'starch',
      'iodine',
      'respiration',
      'aerobic',
      'anaerobic',
      'glucose',
      'atp',
      'transpiration',
      'nutrition'
    ],
    studentPrompt:
      'Explain the relationship between Photosynthesis and Aerobic Respiration in ICSE Class 7 Biology, and why plants respire all day.',
    teacherPrompt:
      'Design a 40-minute ICSE Class 7 Biology lesson plan on Photosynthesis with the Starch-Iodine leaf destarching experiment.'
  },
  {
    id: 'bio-ch5-human-systems',
    subject: 'Biology',
    chapterNumber: 5,
    title: 'Human Excretory & Nervous Systems and Kingdom Classification',
    textbook: 'Learning Elementary Biology — Class 7',
    publisher: 'Goyal Brothers Prakashan (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 29–53 & 83–116',
    ncseBridge: 'NCERT Class VII Science — Ch. 7: Transportation in Animals and Plants',
    summary:
      'Five Kingdom Classification (Whittaker: Monera, Protista, Fungi, Plantae, Animalia), human excretory organs (kidneys, nephrons, ureters, bladder), nervous system (CNS, PNS, reflex arc), and allergies.',
    keyConcepts: [
      'Whittaker Five Kingdoms classify organisms by cell type (prokaryotic/eukaryotic), body organisation, and nutrition',
      'Nephrons are the structural and functional filtration units of the kidney removing urea',
      'Brain divisions: Cerebrum (intelligence/memory), Cerebellum (balance/posture), Medulla Oblongata (involuntary actions)',
      'Reflex arc routes rapid protective responses through the spinal cord before conscious brain processing'
    ],
    formulasOrFacts: [
      'Excretory Pathway: Kidneys → Ureters → Urinary Bladder → Urethra',
      'Reflex Arc: Receptor → Sensory Neuron → Spinal Cord → Motor Neuron → Effector'
    ],
    commonMisconceptions: [
      'Confusing excretion (removal of metabolic wastes like urea) with egestion (removal of undigested faeces).',
      'Placing fungi inside Kingdom Plantae (fungi lack chlorophyll and are heterotrophic saprophytes).'
    ],
    keywords: [
      'kingdom',
      'monera',
      'protista',
      'fungi',
      'classification',
      'whittaker',
      'excretion',
      'kidney',
      'nephron',
      'urea',
      'nervous',
      'brain',
      'cerebrum',
      'cerebellum',
      'medulla',
      'reflex',
      'allergy',
      'blood',
      'heart'
    ],
    studentPrompt:
      'Explain the difference between excretion and egestion, and trace the pathway of a spinal reflex arc in Class 7 Biology.',
    teacherPrompt:
      'Prepare an ICSE Class 7 Biology structured teaching plan on Five Kingdom Classification and Human Excretory System.'
  },

  // =========================================================================
  // COMPUTER STUDIES — Explore Possibilities With Computers (Grade 7)
  // =========================================================================
  {
    id: 'comp-ch1-number-system',
    subject: 'Computer Studies',
    chapterNumber: 2,
    title: 'Number Systems (Binary, Decimal, Octal, Hexadecimal)',
    textbook: 'Explore Possibilities With Computers (Course Book) — Grade 7',
    publisher: 'Possibility Edutech Pvt. Ltd. (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 18–38',
    ncseBridge: 'ICSE Class 7 Computer Studies Core Unit — Digital Number Representation',
    summary:
      'Positional value systems: Decimal (base 10), Binary (base 2), Octal (base 8), Hexadecimal (base 16); Decimal-to-Binary repeated division by 2; Binary-to-Decimal expansion; binary addition rules.',
    keyConcepts: [
      'Computers store all data as bits (0 and 1) because digital transistors operate in OFF/ON states',
      'Convert Decimal to Binary by dividing repeatedly by 2 and reading remainders bottom-to-top (MSB to LSB)',
      'Convert Binary to Decimal by summing each bit × 2^(position) from right (2^0) to left',
      'Binary addition rules: 0+0=0, 0+1=1, 1+0=1, 1+1=10 (sum 0, carry 1)'
    ],
    formulasOrFacts: [
      'Binary Base = 2 {0,1}  |  Octal Base = 8 {0–7}  |  Hex Base = 16 {0–9, A–F}',
      '1 Byte = 8 Bits  |  1 Nibble = 4 Bits  |  1 KB = 1024 Bytes'
    ],
    commonMisconceptions: [
      'Reading binary remainders top-to-bottom instead of bottom-to-top during Decimal-to-Binary conversion.',
      'Starting positional powers of 2 at 2¹ instead of 2⁰ on the rightmost bit.'
    ],
    keywords: [
      'binary',
      'decimal',
      'octal',
      'hexadecimal',
      'number system',
      'base 2',
      'bit',
      'byte',
      'nibble',
      'conversion',
      'hardware',
      'cpu',
      'ram',
      'rom',
      'explore possibilities'
    ],
    studentPrompt:
      'Explain the step-by-step method to convert between Decimal and Binary in ICSE Class 7 Computer Studies.',
    teacherPrompt:
      'Design a 40-minute ICSE Class 7 Computer Studies lesson on Binary-Decimal Conversions with binary addition drills.'
  },
  {
    id: 'comp-ch5-html-cybersecurity',
    subject: 'Computer Studies',
    chapterNumber: 5,
    title: 'HTML5 Web Design, Spreadsheets & Cyber Ethics',
    textbook: 'Explore Possibilities With Computers (Course Book) — Grade 7',
    publisher: 'Possibility Edutech Pvt. Ltd. (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 58–104',
    ncseBridge: 'ICSE Class 7 Computer Studies Core Units — HTML, Ethics & Data Handling',
    summary:
      'Container vs empty HTML tags, headings, lists (<ol>, <ul>), links (<a>), images (<img>), Excel formulas & cell referencing (relative, absolute $A$1), malware types, phishing, plagiarism, and digital footprints.',
    keyConcepts: [
      'Container tags require opening and closing pairs (<p>...</p>); empty tags are self-contained (<br>, <hr>, <img>)',
      'Spreadsheet formulas always begin with "="; absolute references use $ (e.g., $B$2) to lock row/column',
      'Cyber safety: recognise phishing, spyware, ransomware, and uphold intellectual property / anti-plagiarism',
      'Strong passwords combine length, mixed case, digits, and symbols without reusing credentials'
    ],
    formulasOrFacts: [
      'HTML Skeleton: <!DOCTYPE html><html><head><title>...</title></head><body>...</body></html>',
      'Excel Functions: =SUM(A1:A5), =AVERAGE(A1:A5), =MAX(A1:A5), =MIN(A1:A5)'
    ],
    commonMisconceptions: [
      'Forgetting the "=" sign at the start of an Excel formula.',
      'Confusing the <head> metadata section with visible <body> headings (<h1>).'
    ],
    keywords: [
      'html',
      'tag',
      'webpage',
      'excel',
      'spreadsheet',
      'formula',
      'cell reference',
      'cyber',
      'virus',
      'malware',
      'phishing',
      'plagiarism',
      'ethics',
      'python',
      'algorithm',
      'flowchart'
    ],
    studentPrompt:
      'Compare container tags and empty tags in ICSE Class 7 HTML, and explain how absolute cell references ($A$1) work in spreadsheets.',
    teacherPrompt:
      'Build a practical ICSE Class 7 Computer Lab lesson on HTML5 Lists, Links & Cyber Safety Ethics.'
  },

  // =========================================================================
  // ENGLISH — Empowering English (Usha Pandit) + Sri Aurobindo + Courage Readers
  // =========================================================================
  {
    id: 'eng-ch1-grammar-clauses',
    subject: 'English Literature & Language',
    chapterNumber: 1,
    title: 'Empowering English: Tenses, Voice, Reported Speech, Clauses & Composition',
    textbook: 'Empowering English (New Revised Edition) Grade 7 — by Usha Pandit',
    publisher: 'Mindsprings Publishing LLP (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 12–68',
    ncseBridge: 'NCERT Class VII English (Honeycomb) + CISCE Paper 1 Language Standards',
    summary:
      'Tense aspect precision, active-to-passive transformations, reported speech backshift rules, degrees of comparison, question tags, phrases vs clauses (noun, adjective, adverb), and structured ICSE compositions.',
    keyConcepts: [
      'A clause contains a finite verb and subject; a phrase lacks a finite verb',
      'Passive voice shifts focus to the object: Object + form of "be" + Past Participle (V3) + by Subject',
      'Reported speech backshifts present tenses to past when the reporting verb is in past tense (except universal truths)',
      'ICSE Formal Letter format follows strict Sender Address, Date, Receiver Address, Subject, Salutation, Body, and Subscription'
    ],
    formulasOrFacts: [
      'Active → Passive: S + V + O  ⇒  O + be (matched tense) + V3 + by + S',
      'Universal truths do NOT backshift in Indirect Speech (e.g., "The Earth revolves around the Sun")'
    ],
    commonMisconceptions: [
      'Changing tense inside indirect speech even when the reporting verb is in present tense ("He says that...").',
      'Trying to convert intransitive verbs (like "slept" or "arrived") into passive voice.'
    ],
    keywords: [
      'grammar',
      'empowering english',
      'usha pandit',
      'mindsprings',
      'tense',
      'tenses',
      'active',
      'passive',
      'direct',
      'indirect',
      'reported speech',
      'clause',
      'phrase',
      'preposition',
      'letter',
      'essay',
      'comprehension',
      'metaphor',
      'simile',
      'personification'
    ],
    studentPrompt:
      'Explain the ICSE Class 7 rules for converting Active to Passive voice and when Indirect Speech does NOT change tense.',
    teacherPrompt:
      'Create an ICSE Class 7 English Language lesson plan on Clauses, Active/Passive Voice, and Formal Letter Rubric.'
  },
  {
    id: 'eng-ch2-tales-prison-courage',
    subject: 'English Literature & Language',
    chapterNumber: 2,
    title: 'Tales of Prison Life & Indian Courage Biographies (Rifleman Sanjay Kumar / Aaadershir Burjorji Tarapor)',
    textbook: 'Tales of Prison Life (Sri Aurobindo) & Courage Readers (Shyam Kumari)',
    publisher: 'Sri Aurobindo Society / Aurobindo Ashram (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 1–64',
    ncseBridge: 'ICSE Class 7 Prescribed Literature & Character Study',
    summary:
      'Literary comprehension, character analysis, and Reference-to-Context (RTC) study across Sri Aurobindo’s Tales of Prison Life (Alipore Jail reflections, resilience & inner freedom) and Shyam Kumari’s biographies of Rifleman Sanjay Kumar and Lt. Col. Aaadershir Burjorji Tarapor.',
    keyConcepts: [
      'Tales of Prison Life blends historical memoir (1908–09 Alipore Bomb Case detention) with philosophical stillness and quiet humour',
      'Rifleman Sanjay Kumar and Aaadershir Burjorji Tarapor highlight selfless duty, tactical courage, and Param Vir Chakra valour',
      'Reference to Context answers identify speaker/author, setting/situation, and deeper thematic significance'
    ],
    formulasOrFacts: [
      'Prescribed Authors: Sri Aurobindo (Tales of Prison Life); Shyam Kumari (Rifleman Sanjay Kumar, Aaadershir Burjorji Tarapor)',
      'RTC Structure: Speaker/Author + Context/Situation + Explanation of Literary Meaning'
    ],
    commonMisconceptions: [
      'Retelling only surface plot events instead of linking to character traits and authorial tone in Reference-to-Context responses.'
    ],
    keywords: [
      'aurobindo',
      'tales of prison life',
      'alipore',
      'sanjay kumar',
      'rifleman',
      'tarapor',
      'burjorji',
      'shyam kumari',
      'ashram',
      'pondicherry',
      'poem',
      'literature',
      'character'
    ],
    studentPrompt:
      'Explain the central themes of resilience and inner freedom in Sri Aurobindo’s Tales of Prison Life for Class 7 Literature.',
    teacherPrompt:
      'Build a 40-minute Class 7 Literature lesson on Character Sketch and Reference-to-Context analysis using Tales of Prison Life.'
  },

  // =========================================================================
  // HISTORY & CIVICS — Frank Modern Certificate History & Civics - 7
  // =========================================================================
  {
    id: 'hist-ch1-medieval-india',
    subject: 'History & Civics',
    chapterNumber: 3,
    title: 'The Delhi Sultanate & The Mughal Empire',
    textbook: 'Frank Modern Certificate — History & Civics — Class 7',
    publisher: 'Frank Brothers & Company / Macmillan (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 28–66',
    ncseBridge: 'NCERT Class VII History (Our Pasts II) — Ch. 3 & Ch. 4: Delhi 12th–15th Century & The Mughals',
    summary:
      'Five dynasties of the Delhi Sultanate (Slave, Khilji, Tughlaq, Sayyid, Lodi), Iqta administration, Alauddin Khilji’s market reforms, and the Great Mughals (Babur to Aurangzeb) with Akbar’s Mansabdari and Sulh-i-Kul policies.',
    keyConcepts: [
      'Delhi Sultanate (1206–1526 CE) introduced centralised Iqta revenue assignments and Indo-Islamic architecture',
      'First Battle of Panipat (1526) marked Babur’s victory over Ibrahim Lodi and founded the Mughal Empire',
      'Akbar’s Sulh-i-Kul (universal peace), abolition of Jizya, and Mansabdari/Zabt (Todar Mal) revenue system strengthened unity',
      'Bhakti & Sufi movements promoted devotion, equality, and vernacular languages across medieval India'
    ],
    formulasOrFacts: [
      'Delhi Sultanate Sequence: Slave → Khilji → Tughlaq → Sayyid → Lodi (1206–1526 CE)',
      'First Battle of Panipat: 1526 CE  |  Akbar’s Reign: 1556–1605 CE'
    ],
    commonMisconceptions: [
      'Confusing the First Battle of Panipat (1526, Babur vs Ibrahim Lodi) with the Second Battle (1556, Akbar vs Hemu).',
      'Equating Mansabdars with hereditary feudal lords (Mansabdari ranks were non-hereditary and transferable).'
    ],
    keywords: [
      'delhi sultanate',
      'mughal',
      'akbar',
      'babur',
      'panipat',
      'khilji',
      'tughlaq',
      'mansabdari',
      'sulh-i-kul',
      'iqta',
      'bhakti',
      'sufi',
      'medieval',
      'history',
      'frank modern'
    ],
    studentPrompt:
      'Explain how Akbar’s Mansabdari system and Sulh-i-Kul policy consolidated the Mughal Empire in ICSE Class 7 History.',
    teacherPrompt:
      'Design a 40-minute ICSE Class 7 History lesson comparing Delhi Sultanate Iqta administration and Mughal Mansabdari.'
  },
  {
    id: 'civ-ch1-indian-constitution',
    subject: 'History & Civics',
    chapterNumber: 10,
    title: 'The Constitution of India, Fundamental Rights & Directive Principles',
    textbook: 'Frank Modern Certificate — History & Civics — Class 7',
    publisher: 'Frank Brothers & Company / Macmillan (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 102–134',
    ncseBridge: 'NCERT Class VII Civics (Social and Political Life II) — Equality & Constitutional Democracy',
    summary:
      'Framing of the Constitution (Constituent Assembly, Dr. B.R. Ambedkar), Preamble ideals (Sovereign, Socialist, Secular, Democratic, Republic), six Fundamental Rights, Fundamental Duties, and Directive Principles of State Policy (DPSP).',
    keyConcepts: [
      'Adopted on 26 November 1949 and enforced on 26 January 1950 (Republic Day)',
      'Fundamental Rights (Part III) are justiciable—citizens can approach courts if violated',
      'Directive Principles of State Policy (Part IV) are non-justiciable welfare guidelines for governments',
      'Right to Constitutional Remedies (Article 32) was called the "heart and soul" of the Constitution by Dr. Ambedkar'
    ],
    formulasOrFacts: [
      'Adopted: 26 Nov 1949  |  Came into force: 26 Jan 1950',
      '6 Fundamental Rights: Equality, Freedom, Against Exploitation, Freedom of Religion, Cultural & Educational, Constitutional Remedies'
    ],
    commonMisconceptions: [
      'Thinking Directive Principles can be directly enforced in a court of law (they are non-justiciable, unlike Fundamental Rights).',
      'Confusing Independence Day (15 Aug 1947) with Constitution enforcement (26 Jan 1950).'
    ],
    keywords: [
      'constitution',
      'preamble',
      'fundamental rights',
      'fundamental duties',
      'directive principles',
      'dpsp',
      'ambedkar',
      'secular',
      'sovereign',
      'democratic',
      'republic',
      'civics',
      'parliament',
      'equality'
    ],
    studentPrompt:
      'Distinguish between Fundamental Rights and Directive Principles of State Policy in ICSE Class 7 Civics.',
    teacherPrompt:
      'Create an interactive ICSE Class 7 Civics classroom debate on Preamble Ideals and Fundamental Rights vs Duties.'
  },

  // =========================================================================
  // GEOGRAPHY — Voyage Geography Class 7 (Oxford University Press)
  // =========================================================================
  {
    id: 'geo-ch2-atmosphere-weather',
    subject: 'Geography',
    chapterNumber: 2,
    title: 'The Atmosphere, Weather & Climate Instruments',
    textbook: 'Voyage — Geography for ICSE Middle School — Class 7',
    publisher: 'Oxford University Press (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 18–46',
    ncseBridge: 'NCERT Class VII Geography (Our Environment) — Ch. 4: Air',
    summary:
      'Composition of air, five atmospheric layers (Troposphere, Stratosphere, Mesosphere, Thermosphere, Exosphere), greenhouse effect, ozone depletion, weather vs climate, and meteorological instruments.',
    keyConcepts: [
      'Troposphere contains ~75% of atmospheric mass and all weather phenomena; temperature drops with altitude (normal lapse rate)',
      'Stratosphere houses the Ozone layer (O₃) absorbing harmful UV radiation and offers calm jet flight paths',
      'Weather is short-term daily atmospheric state; Climate is the 30+ year average pattern of a region',
      'Key instruments: Barometer (pressure), Hygrometer (humidity), Anemometer (wind speed), Wind Vane (wind direction), Rain Gauge'
    ],
    formulasOrFacts: [
      'Layers bottom-to-top: Troposphere → Stratosphere → Mesosphere → Thermosphere → Exosphere',
      'Normal Lapse Rate: ≈ 6.5°C decrease per 1,000 m ascent in the troposphere'
    ],
    commonMisconceptions: [
      'Confusing weather (daily) with climate (long-term average).',
      'Thinking global warming is caused by the ozone hole directly (greenhouse gases trap infrared radiation; CFCs deplete ozone).'
    ],
    keywords: [
      'atmosphere',
      'troposphere',
      'stratosphere',
      'ozone',
      'greenhouse',
      'weather',
      'climate',
      'barometer',
      'anemometer',
      'hygrometer',
      'rainfall',
      'wind',
      'humidity',
      'lapse rate',
      'voyage'
    ],
    studentPrompt:
      'Explain the five layers of the atmosphere in ICSE Class 7 Geography and why weather occurs only in the troposphere.',
    teacherPrompt:
      'Design an ICSE Class 7 Geography lesson plan on Atmospheric Layers, Greenhouse Effect, and Weather Instruments.'
  },
  {
    id: 'geo-ch4-weathering-continents',
    subject: 'Geography',
    chapterNumber: 4,
    title: 'Weathering, Soil Formation & Study of Continents (Europe, Africa, Australia, Antarctica)',
    textbook: 'Voyage — Geography for ICSE Middle School — Class 7',
    publisher: 'Oxford University Press (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 47–118',
    ncseBridge: 'NCERT Class VII Geography — Ch. 2 & Ch. 3: Inside Our Earth & Our Changing Earth',
    summary:
      'Physical, chemical, and biological weathering; soil profile horizons (O, A, B, C, Bedrock); soil conservation; and physical/economic geography of Europe, Africa, Australia, and Antarctica.',
    keyConcepts: [
      'Weathering is in-situ breakdown of rocks; Erosion involves transportation by wind, water, or glaciers',
      'Topsoil (Horizon A) is rich in humus; contour ploughing, terrace farming, and afforestation prevent soil erosion',
      'Topographical maps use conventional colours (blue=water, green=forests, yellow=cultivable land, brown=contours)',
      'Australia features the Great Dividing Range and Great Barrier Reef; Africa spans the Equator, Tropic of Cancer, and Capricorn'
    ],
    formulasOrFacts: [
      'Soil Horizons: O (Organic) → A (Topsoil/Humus) → B (Subsoil) → C (Weathered Rock) → R (Bedrock)',
      'Map Scale: Statement scale, Representative Fraction (RF), Linear scale'
    ],
    commonMisconceptions: [
      'Using "weathering" and "erosion" interchangeably (weathering breaks rock in place; erosion transports it).'
    ],
    keywords: [
      'weathering',
      'erosion',
      'soil',
      'humus',
      'continent',
      'europe',
      'africa',
      'australia',
      'antarctica',
      'topographical',
      'contour',
      'scale',
      'map',
      'barrier reef',
      'sahara',
      'alps'
    ],
    studentPrompt:
      'Distinguish between weathering and erosion in ICSE Class 7 Geography and describe the horizons of a soil profile.',
    teacherPrompt:
      'Build a 40-minute ICSE Class 7 Geography lesson on Topographical Map Reading and Soil Conservation.'
  },

  // =========================================================================
  // HINDI — Together With 'ओस के मोती' (Rachna Sagar) & Sugam Hindi Vyakaran - 7 (Cordova)
  // =========================================================================
  {
    id: 'hindi-ch1-vyakaran-lekhan',
    subject: 'Hindi — हिन्दी',
    chapterNumber: 1,
    title: "Together With 'ओस के मोती' एवं सुगम हिन्दी व्याकरण: संज्ञा, कारक, संधि, समास व पत्र लेखन",
    textbook: "Together With 'ओस के मोती' (Class 7) + सुगम हिन्दी व्याकरण - 7",
    publisher: 'Rachna Sagar Pvt. Ltd. & Cordova Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 1–58',
    ncseBridge: 'NCERT कक्षा 7 वसंत भाग-2 एवं CISCE नवीन पाठ्यक्रम संरेखण',
    summary:
      "रचना सागर 'ओस के मोती' के गद्य-पद्य पाठों का भावार्थ एवं सुगम हिन्दी व्याकरण (कॉरडोवा) के अंतर्गत संज्ञा के भेद, कारक एवं विभक्ति चिह्न, स्वर संधि, समास, मुहावरे तथा औपचारिक/अनौपचारिक पत्र लेखन।",
    keyConcepts: [
      'कारक वाक्य में संज्ञा/सर्वनाम का क्रिया से संबंध दर्शाते हैं (कर्ता ने, कर्म को, करण से/के द्वारा...)',
      'संधि दो निकटवर्ती वर्णों के मेल से उत्पन्न विकार है, जबकि समास शब्दों का संक्षिप्तीकरण है',
      'औपचारिक पत्र में प्रेषक का पता, दिनांक, सेवा में, विषय, महोदय/महोदया और भवदीय आवश्यक हैं'
    ],
    formulasOrFacts: [
      'दीर्घ संधि: अ/आ + अ/आ = आ (विद्या + आलय = विद्यालय)',
      'गुण संधि: अ/आ + इ/ई = ए (महा + इंद्र = महेंद्र)'
    ],
    commonMisconceptions: [
      'संधि (वर्णों का मेल) और समास (शब्दों का मेल) को एक ही समझ लेना।'
    ],
    keywords: [
      'hindi',
      'हिन्दी',
      'ओस के मोती',
      'सुगम हिन्दी व्याकरण',
      'rachna sagar',
      'cordova',
      'व्याकरण',
      'संधि',
      'समास',
      'कारक',
      'संज्ञा',
      'सर्वनाम',
      'पत्र',
      'मुहावरे',
      'अनुच्छेद'
    ],
    studentPrompt:
      "सुगम हिन्दी व्याकरण कक्षा 7 में संधि और समास के बीच मुख्य अंतर उदाहरण सहित समझाइए।",
    teacherPrompt:
      "Together With 'ओस के मोती' एवं सुगम हिन्दी व्याकरण कक्षा 7 के लिए 40 मिनट की पाठ योजना तैयार कीजिए।"
  },

  // =========================================================================
  // SANSKRIT — Dev Bhasha - 7 (Integral Publications)
  // =========================================================================
  {
    id: 'sanskrit-ch1-dhatu-shabdarupa',
    subject: 'Sanskrit — संस्कृतम्',
    chapterNumber: 1,
    title: 'देवभाषा: धातुरूपाणि (लट्, लृट्, लङ् लकाराः), शब्दरूपाणि एवं सुभाषितानि',
    textbook: 'Dev Bhasha — Class 7 (देवभाषा - 7)',
    publisher: 'Integral Publications (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 7–44',
    ncseBridge: 'NCERT कक्षा 7 रुचिरा द्वितीयो भागः — सुभाषितानि एवं व्याकरण',
    summary:
      'देवभाषा कक्षा 7 के अंतर्गत लट् (वर्तमान), लृट् (भविष्यत्), लङ् (भूतकाल) धातुरूपाणि, अकारान्त/आकारान्त शब्दरूपाणि, उपपद विभक्तयः तथा सुभाषित-श्लोकानाम् अन्वयः।',
    keyConcepts: [
      'लट् लकार वर्तमान काल, लृट् लकार भविष्यत् काल, तथा लङ् लकार अनद्यतन भूतकाल को दर्शाता है',
      'कर्ता के पुरुष (प्रथम, मध्यम, उत्तम) और वचन (एक, द्वि, बहु) के अनुसार क्रिया का रूप निर्धारित होता है',
      'सुभाषित श्लोकों का भावार्थ समझने के लिए पहले अन्वय (गद्य क्रम) बनाया जाता है'
    ],
    formulasOrFacts: [
      'पठ् धातु (लट्): पठति, पठतः, पठन्ति | पठसि, पठथः, पठथ | पठामि, पठावः, पठामः',
      'लङ् लकार चिह्न: धातु से पूर्व "अ" उपसर्ग जुड़ता है (अपठत्, अपठताम्, अपठन्)'
    ],
    commonMisconceptions: [
      'द्विवचन (दो के लिए) की उपेक्षा करके सीधे बहुवचन का प्रयोग कर देना।'
    ],
    keywords: [
      'sanskrit',
      'संस्कृत',
      'dev bhasha',
      'देवभाषा',
      'integral publications',
      'धातु',
      'लकार',
      'लट्',
      'लृट्',
      'लङ्',
      'शब्दरूप',
      'विभक्ति',
      'सुभाषित',
      'श्लोक'
    ],
    studentPrompt:
      'देवभाषा कक्षा 7 में लट्, लृट् और लङ् लकार के प्रयोग का अंतर सरल उदाहरण सहित समझाइए।',
    teacherPrompt:
      'देवभाषा कक्षा 7 (लङ् लकार एवं उपपद विभक्ति) के लिए 40 मिनट की रोचक पाठ योजना बनाइए।'
  },

  // =========================================================================
  // GENERAL KNOWLEDGE — Train Your Brain - 7 (Acevision Publishers Pvt. Ltd.)
  // =========================================================================
  {
    id: 'gk-ch1-india-science-world',
    subject: 'General Knowledge',
    chapterNumber: 1,
    title: 'Train Your Brain: India Heritage, Space Missions (ISRO), World Organisations & Logical Reasoning',
    textbook: 'Train Your Brain — Class 7',
    publisher: 'Acevision Publishers Pvt. Ltd. (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 5–48',
    ncseBridge: 'National Science & GK Olympiad + Current Affairs (Live Web Verified)',
    summary:
      'Indian space milestones (Chandrayaan-3, Aditya-L1, Gaganyaan), UN & global agencies (UNESCO, WHO, UNICEF), Indian heritage & UNESCO sites, and logical reasoning puzzles.',
    keyConcepts: [
      'ISRO missions: Chandrayaan-3 achieved lunar south-pole landing (Aug 2023); Aditya-L1 studies the Sun from Lagrange Point L1',
      'UN specialised agencies: UNESCO (Paris), WHO (Geneva), UNICEF (New York), ICJ (The Hague)',
      'For fast-changing current affairs (sports, awards, officeholders), enable Live Web Search for verified real-time facts'
    ],
    formulasOrFacts: [
      'UN Headquarters: New York  |  ICJ: The Hague, Netherlands  |  ISRO HQ: Bengaluru',
      'National Science Day: 28 February (Discovery of the Raman Effect)'
    ],
    commonMisconceptions: [
      'Relying on static textbook editions for current officeholders or recent international awards instead of verifying live.'
    ],
    keywords: [
      'gk',
      'general knowledge',
      'train your brain',
      'acevision',
      'isro',
      'chandrayaan',
      'aditya',
      'unesco',
      'who',
      'unicef',
      'united nations',
      'current affairs',
      'quiz',
      'olympiad',
      'space',
      'india',
      'award',
      'nobel'
    ],
    studentPrompt:
      'Test my knowledge of ISRO space missions and UN agencies from Train Your Brain Class 7.',
    teacherPrompt:
      'Design an inter-house Class 7 General Knowledge & Analytical Reasoning quiz round with answer key.'
  },

  // =========================================================================
  // FINANCIAL EDUCATION — Financial Education Work Book for Class 7 (NCFE)
  // =========================================================================
  {
    id: 'fin-ch1-literacy-banking',
    subject: 'Financial Education',
    chapterNumber: 1,
    title: 'Money Management, Budgeting, Banking & Digital Financial Safety',
    textbook: 'Financial Education Work Book for Class 7',
    publisher: 'National Centre for Financial Education (NCFE) (Seth M.R. Jaipuria 2026–27)',
    pageRange: 'pp. 1–44',
    ncseBridge: 'NCFE / RBI Financial Literacy Curriculum — Class VII',
    summary:
      'Needs vs wants, household & student budgeting, savings accounts, simple vs compound growth basics, UPI & digital payment hygiene, and protecting against financial scams/OTP fraud.',
    keyConcepts: [
      'Budgeting matches expected income against planned needs, savings (pay-yourself-first), and discretionary wants',
      'Scheduled banks safeguard savings and pay interest while offering cheques, debit cards, and UPI transfers',
      'Never share PIN, CVV, or OTP codes; verify merchant UPI IDs and avoid too-good-to-be-true prize links'
    ],
    formulasOrFacts: [
      'Budget Rule: Savings = Income − Expenses (plan savings before discretionary spending)',
      'RBI / Cyber Crime Helpline: 1930 | Never share OTP, PIN, or CVV with anyone'
    ],
    commonMisconceptions: [
      'Treating wants (impulse purchases) as essential needs inside a monthly budget.',
      'Assuming receiving money via UPI requires entering a UPI PIN (PIN is only required to SEND money).'
    ],
    keywords: [
      'financial',
      'financial education',
      'ncfe',
      'budget',
      'budgeting',
      'saving',
      'savings',
      'bank',
      'banking',
      'upi',
      'digital payment',
      'needs vs wants',
      'insurance',
      'tax',
      'otp',
      'fraud'
    ],
    studentPrompt:
      'Explain the difference between needs and wants, and key UPI safety rules from the NCFE Class 7 Financial Education Workbook.',
    teacherPrompt:
      'Design a 40-minute Class 7 Financial Education activity on student budgeting and safe digital banking.'
  }
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export function getGrade7BooksGrouped(subjectFilter?: string): Grade7TextbookBookMeta[] {
  const bySubject = new Map<string, Grade7TextbookBookMeta>();
  for (const ch of GRADE_7_TEXTBOOK_CATALOG) {
    if (subjectFilter && subjectFilter !== 'All' && subjectFilter !== 'All Subjects' && ch.subject !== subjectFilter) {
      continue;
    }
    const existing = bySubject.get(ch.subject);
    if (existing) {
      existing.chapters.push(ch);
    } else {
      bySubject.set(ch.subject, {
        subject: ch.subject,
        primaryBook: ch.textbook,
        publisher: ch.publisher,
        ncseReference: ch.ncseBridge,
        chapters: [ch]
      });
    }
  }
  return Array.from(bySubject.values());
}

const SUBJECT_HINT_PATTERNS: Array<{ subject: string; pattern: RegExp }> = [
  {
    subject: 'Physics',
    pattern:
      /\b(physics|srijan|s\.c\.\s*gupta|density|volume|eureka|speed|velocity|acceleration|motion|rest|pendulum|oscillation|oscillations|heat|temperature|conduction|convection|radiation|thermometer|celsius|fahrenheit|kelvin|reflection|refraction|mirror|lens|echo|sound|pitch|amplitude|frequency|electricity|circuit|fuse|electromagnet|magnetism|force|pressure|work|energy|weight|newton|joule|watt|pascal|km\/h|m\/s)\b/i
  },
  {
    subject: 'Chemistry',
    pattern:
      /\b(chemistry|chemical|concise\s+chemistry|atom|atomic|proton|protons|neutron|neutrons|electron|electrons|valency|radical|radicals|criss-cross|balanced?\s+equation|balance\s+[a-z0-9+()\s]+(?:->|→|=)|compound|element|mixture|distillation|chromatography|filtration|sublimation|separating\s+funnel|rusting|galvanisation|galvanization|acid|acids|base|bases|alkali|litmus|indicator|neutralisation|neutralization|phenolphthalein|lime\s+water|mol(?:ecular)?\s+mass)\b/i
  },
  {
    subject: 'Biology',
    pattern:
      /\b(biology|learning\s+elementary\s+biology|goyal\s+brothers|photosynthesis|chlorophyll|chloroplast|stomata|starch|iodine|respiration|aerobic|anaerobic|tissue|tissues|xylem|phloem|meristematic|parenchyma|sclerenchyma|epithelial|connective|tendon|ligament|neuron|kingdom|monera|protista|fungi|plantae|animalia|whittaker|excretion|kidney|nephron|urea|egestion|nervous|brain|cerebrum|cerebellum|medulla|reflex|allergy|heart|blood|transpiration)\b/i
  },
  {
    subject: 'English Literature & Language',
    pattern:
      /\b(english|empowering\s+english|usha\s+pandit|mindsprings|aurobindo|prison\s+life|sanjay\s+kumar|tarapor|shyam\s+kumari|grammar|tense|tenses|active\s+voice|passive\s+voice|indirect\s+speech|reported\s+speech|direct\s+speech|clause|clauses|phrase|preposition|conjunction|degree\s+of\s+comparison|comparative\s+degree|superlative\s+degree|question\s+tag|punctuate|punctuation|essay|formal\s+letter|informal\s+letter|notice|composition|comprehension|reference\s+to\s+context|metaphor|simile|personification|alliteration|poet|stanza)\b/i
  },
  {
    subject: 'Computer Studies',
    pattern:
      /\b(computer|explore\s+possibilities|binary|octal|hexadecimal|base\s*2|number\s+system|bit|byte|nibble|html|webpage|tag|excel|spreadsheet|cell\s+reference|malware|virus|phishing|plagiarism|cyber|algorithm|flowchart|python)\b/i
  },
  {
    subject: 'Mathematics',
    pattern:
      /\b(math|maths|mathematics|understanding\s+mathematics|aggarwal|agarwal|integer|integers|bodmas|vbodmas|fraction|fractions|rational\s+number|decimal|decimals|exponent|exponents|indices|percentage|percent|profit|loss|simple\s+interest|discount|cost\s+price|selling\s+price|marked\s+price|linear\s+equation|algebra|polynomial|triangle|triangles|congruence|congruent|sss|sas|asa|rhs|pythagoras|hypotenuse|area|perimeter|circumference|hcf|lcm|ratio|proportion)\b/i
  },
  {
    subject: 'Financial Education',
    pattern:
      /\b(financial\s+education|ncfe|budget|budgeting|savings?\s+account|needs\s+vs\s+wants|upi|digital\s+payment|otp|cvv|pocket\s+money|bank\s+account)\b/i
  },
  {
    subject: 'History & Civics',
    pattern:
      /\b(history|civics|frank\s+modern|delhi\s+sultanate|mughal|akbar|babur|panipat|khilji|tughlaq|mansabdari|sulh-i-kul|iqta|bhakti|sufi|constitution|preamble|fundamental\s+rights|fundamental\s+duties|directive\s+principles|dpsp|ambedkar|parliament)\b/i
  },
  {
    subject: 'Geography',
    pattern:
      /\b(geography|voyage|atmosphere|troposphere|stratosphere|weathering|soil|rock|rocks|igneous|sedimentary|metamorphic|latitude|longitude|topographical|contour|europa|europe|australia|antarctica|africa)\b/i
  },
  {
    subject: 'Hindi — हिन्दी',
    pattern: /[\u0900-\u097F]|\b(hindi|sugam|vyakaran|os\s+ke\s+moti|rachna\s+sagar|cordova|samas|sandhi|muhavare|vilom|paryayvachi)\b/i
  },
  {
    subject: 'Sanskrit — संस्कृतम्',
    pattern: /\b(sanskrit|dev\s+bhasha|integral\s+publications|lakar|vibhakti|dhatu|shabd\s+roop|shloka|ruchira)\b/i
  },
  {
    subject: 'General Knowledge',
    pattern: /\b(gk|general\s+knowledge|train\s+your\s+brain|acevision|isro|chandrayaan|unesco)\b/i
  }
];

function isUnspecificSubject(subject?: string): boolean {
  if (!subject) return true;
  const s = subject.trim().toLowerCase();
  return !s || s === 'all' || s === 'all subjects' || s === 'auto' || s === 'general';
}

export function inferGrade7Subject(query: string, explicitSubject?: string): string | undefined {
  if (!isUnspecificSubject(explicitSubject)) {
    return explicitSubject;
  }
  const text = (query || '').trim();
  if (!text) return undefined;

  for (const rule of SUBJECT_HINT_PATTERNS) {
    if (rule.pattern.test(text)) {
      return rule.subject;
    }
  }

  // Pure standalone arithmetic expression like "9/3", "17 * 8", "solve 3x + 7 = 22"
  if (/^(?:what\s+is\s+|solve\s+|evaluate\s+|simplify\s+)?\d+\s*[+\-*/×÷^x=]\s*\d+/i.test(text)) {
    return 'Mathematics';
  }

  return undefined;
}

const TEXTBOOK_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'about',
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'whose',
  'why',
  'how',
  'are',
  'was',
  'were',
  'been',
  'being',
  'have',
  'has',
  'had',
  'does',
  'did',
  'can',
  'could',
  'should',
  'would',
  'will',
  'shall',
  'may',
  'might',
  'must',
  'you',
  'your',
  'yours',
  'they',
  'them',
  'their',
  'theirs',
  'our',
  'ours',
  'his',
  'her',
  'hers',
  'its',
  'not',
  'but',
  'all',
  'any',
  'one',
  'two',
  'three',
  'many',
  'much',
  'some',
  'more',
  'most',
  'very',
  'just',
  'also',
  'then',
  'than',
  'here',
  'there',
  'explain',
  'describe',
  'define',
  'tell',
  'give',
  'gave',
  'given',
  'show',
  'please',
  'help',
  'class',
  'grade',
  'icse',
  'ncse',
  'ncert',
  'chapter',
  'topic',
  'question',
  'answer'
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchGrade7TextbookReferences(params: {
  subject?: string;
  query: string;
  limit?: number;
}): TextbookSearchMatch[] {
  const { subject, query, limit = 3 } = params;
  const normalizedQuery = (query || '').toLowerCase();
  const uniqueTokens = Array.from(
    new Set(tokenize(query || '').filter((tok) => tok.length >= 3 && !TEXTBOOK_STOP_WORDS.has(tok)))
  );
  const resolvedSubject = inferGrade7Subject(query, subject);

  const scored: TextbookSearchMatch[] = GRADE_7_TEXTBOOK_CATALOG.map((chapter) => {
    let score = 0;

    // Subject alignment boost only when an explicit or clearly inferred subject matches
    if (resolvedSubject && chapter.subject.toLowerCase() === resolvedSubject.toLowerCase()) {
      score += 4;
    }

    // Exact whole-word/phrase keyword matches
    for (const kw of chapter.keywords) {
      const lowerKw = kw.toLowerCase().trim();
      if (!lowerKw) continue;
      const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(lowerKw)}(?:$|[^\\p{L}\\p{N}])`, 'u');
      if (pattern.test(normalizedQuery)) {
        score += lowerKw.includes(' ') ? 7 : 4.5;
      }
    }

    // Whole-word token overlap against title and chapter text (never substring matching like "you" in "your")
    const titleTokens = new Set(tokenize(chapter.title));
    const haystack = `${chapter.title} ${chapter.textbook} ${chapter.publisher} ${chapter.summary} ${chapter.keyConcepts.join(' ')} ${chapter.formulasOrFacts.join(' ')} ${chapter.ncseBridge}`;
    const haystackTokens = new Set(tokenize(haystack));
    for (const tok of uniqueTokens) {
      if (titleTokens.has(tok)) {
        score += 3;
      } else if (haystackTokens.has(tok)) {
        score += 1.5;
      }
    }

    return {
      id: chapter.id,
      subject: chapter.subject,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      textbook: chapter.textbook,
      publisher: chapter.publisher,
      pageRange: chapter.pageRange,
      ncseBridge: chapter.ncseBridge,
      summary: chapter.summary,
      keyConcepts: chapter.keyConcepts,
      formulasOrFacts: chapter.formulasOrFacts,
      score
    };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  const strongMatches = sorted.filter((m) => m.score >= 4.5);

  if (strongMatches.length > 0) {
    return strongMatches.slice(0, limit);
  }

  // Return top chapters ONLY when an explicit/inferred subject is known
  if (resolvedSubject) {
    const subjectFallback = sorted.filter(
      (m) => m.subject.toLowerCase() === resolvedSubject.toLowerCase()
    );
    if (subjectFallback.length > 0) {
      return subjectFallback.slice(0, Math.min(2, limit));
    }
  }

  return [];
}

export function formatTextbookGroundingBlock(matches: TextbookSearchMatch[]): string {
  if (!matches || matches.length === 0) return '';

  const lines: string[] = [
    '================================================================================',
    'SETH M.R. JAIPURIA SCHOOL, LUCKNOW (SESSION 2026-27) — SILENT SYLLABUS CONTEXT',
    '================================================================================',
    'Use these Grade 7 syllabus facts internally ONLY if they directly match the exact topic asked.',
    'Do NOT append a "Book & Page Reference:" line, chapter citation footer, or textbook bibliography to your response.',
    ''
  ];

  for (const m of matches) {
    lines.push(
      `[SYLLABUS] ${m.subject} — ${m.title}`,
      `  • Core Concepts: ${m.keyConcepts.join(' | ')}`,
      `  • Key Formulas / Facts: ${m.formulasOrFacts.join(' | ')}`
    );
  }

  lines.push('================================================================================');
  return lines.join('\n');
}
