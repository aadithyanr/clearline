import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;

const hospitals = [
  {
    "name": "Jog Hospital",
    "city": "pune",
    "latitude": 18.5091699,
    "longitude": 73.82159066,
    "totalBeds": 103,
    "erBeds": 22,
    "phone": "+91 20 6324216",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Parivartan Ayurved Hospital",
    "city": "pune",
    "latitude": 18.5132423,
    "longitude": 73.80802103,
    "totalBeds": 72,
    "erBeds": 5,
    "phone": "+91 20 1736362",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Devyani Multy Speciality Hospital",
    "city": "pune",
    "latitude": 18.4949895,
    "longitude": 73.81212228,
    "totalBeds": 104,
    "erBeds": 18,
    "phone": "+91 20 7881460",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Suyash Hospityal",
    "city": "pune",
    "latitude": 18.5000925,
    "longitude": 73.81233642,
    "totalBeds": 192,
    "erBeds": 13,
    "phone": "+91 20 2450760",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Devyani Hospital Surguri Maternity & General Nursing Home",
    "city": "pune",
    "latitude": 18.4959252,
    "longitude": 73.81222704,
    "totalBeds": 79,
    "erBeds": 6,
    "phone": "+91 20 7350050",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Krishna Hospital",
    "city": "pune",
    "latitude": 18.5092184,
    "longitude": 73.81268003,
    "totalBeds": 99,
    "erBeds": 11,
    "phone": "+91 20 8761732",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bakshi Hospital",
    "city": "pune",
    "latitude": 18.5077479,
    "longitude": 73.80542197,
    "totalBeds": 33,
    "erBeds": 13,
    "phone": "+91 20 1115982",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sahyadri Hospital, Kothrud",
    "city": "pune",
    "latitude": 18.5074423,
    "longitude": 73.80575713,
    "totalBeds": 142,
    "erBeds": 10,
    "phone": "+91 20 7820806",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Devyani Multy Speciality Hospital",
    "city": "pune",
    "latitude": 18.4959176,
    "longitude": 73.81243305,
    "totalBeds": 104,
    "erBeds": 20,
    "phone": "+91 20 8297203",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Vision Eye Center",
    "city": "pune",
    "latitude": 18.5075957,
    "longitude": 73.80689646,
    "totalBeds": 27,
    "erBeds": 23,
    "phone": "+91 20 2567867",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sarpotdar Eye Hospital",
    "city": "pune",
    "latitude": 18.510586,
    "longitude": 73.81989926,
    "totalBeds": 53,
    "erBeds": 13,
    "phone": "+91 20 3683643",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kulkarni Endo Surgery  Institute & Re-Effective Urologist Center",
    "city": "pune",
    "latitude": 18.5097874,
    "longitude": 73.80298726,
    "totalBeds": 158,
    "erBeds": 15,
    "phone": "+91 20 8297561",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Renu Hospital",
    "city": "pune",
    "latitude": 18.5719383,
    "longitude": 73.83759855,
    "totalBeds": 191,
    "erBeds": 5,
    "phone": "+91 20 5233127",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kotbagi  Hospital Pvt. Ltd.",
    "city": "pune",
    "latitude": 18.5619453,
    "longitude": 73.8048489,
    "totalBeds": 150,
    "erBeds": 13,
    "phone": "+91 20 5243158",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Anand Hospital",
    "city": "pune",
    "latitude": 18.4713277,
    "longitude": 73.86397524,
    "totalBeds": 109,
    "erBeds": 15,
    "phone": "+91 20 2575428",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Unity Ortho & Eyes Hospital",
    "city": "pune",
    "latitude": 18.4712384,
    "longitude": 73.85746393,
    "totalBeds": 189,
    "erBeds": 23,
    "phone": "+91 20 8549496",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Mehta Nursing Home",
    "city": "pune",
    "latitude": 18.4991081,
    "longitude": 73.86918789,
    "totalBeds": 103,
    "erBeds": 16,
    "phone": "+91 20 5661735",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dugad Hospital",
    "city": "pune",
    "latitude": 18.4910595,
    "longitude": 73.8581677,
    "totalBeds": 154,
    "erBeds": 20,
    "phone": "+91 20 7029600",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Chintamani Hospital",
    "city": "pune",
    "latitude": 18.4757006,
    "longitude": 73.86208654,
    "totalBeds": 173,
    "erBeds": 16,
    "phone": "+91 20 8505332",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sahydri Hospital Ltd. SahyadriHospital, Bibvewadi",
    "city": "pune",
    "latitude": 18.4768711,
    "longitude": 73.8625507,
    "totalBeds": 136,
    "erBeds": 8,
    "phone": "+91 20 4663799",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Bande Hospital",
    "city": "pune",
    "latitude": 18.4902514,
    "longitude": 73.8579388,
    "totalBeds": 111,
    "erBeds": 12,
    "phone": "+91 20 3594759",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Rao Nursing Home",
    "city": "pune",
    "latitude": 18.4846951,
    "longitude": 73.85879594,
    "totalBeds": 113,
    "erBeds": 23,
    "phone": "+91 20 1589699",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Rukhmini Hospital",
    "city": "pune",
    "latitude": 18.4950028,
    "longitude": 73.86184672,
    "totalBeds": 183,
    "erBeds": 15,
    "phone": "+91 20 3977829",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kamla Nursing Home",
    "city": "pune",
    "latitude": 18.4892497,
    "longitude": 73.86224102,
    "totalBeds": 110,
    "erBeds": 9,
    "phone": "+91 20 4624121",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Parasnis Hospital",
    "city": "pune",
    "latitude": 18.4746652,
    "longitude": 73.85874774,
    "totalBeds": 88,
    "erBeds": 9,
    "phone": "+91 20 3329884",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Karne Hospital Pvt. Ltd. OrthopedicNursing Home",
    "city": "pune",
    "latitude": 18.4957009,
    "longitude": 73.85831637,
    "totalBeds": 115,
    "erBeds": 19,
    "phone": "+91 20 8937967",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Bhagli Clinic",
    "city": "pune",
    "latitude": 18.4746388,
    "longitude": 73.85791895,
    "totalBeds": 80,
    "erBeds": 18,
    "phone": "+91 20 1931231",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Bhagli Nursing Home",
    "city": "pune",
    "latitude": 18.4746086,
    "longitude": 73.85792077,
    "totalBeds": 113,
    "erBeds": 17,
    "phone": "+91 20 9970610",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Ranka Medical Foundetion, RankaHospital",
    "city": "pune",
    "latitude": 18.494933,
    "longitude": 73.86184047,
    "totalBeds": 45,
    "erBeds": 11,
    "phone": "+91 20 5879202",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sangam Hospital",
    "city": "pune",
    "latitude": 18.4765191,
    "longitude": 73.85750876,
    "totalBeds": 54,
    "erBeds": 6,
    "phone": "+91 20 5647671",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kirad Hospital",
    "city": "pune",
    "latitude": 18.5142545,
    "longitude": 73.86886318,
    "totalBeds": 199,
    "erBeds": 17,
    "phone": "+91 20 1055659",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Renu Maternity & Nursing Home",
    "city": "pune",
    "latitude": 18.5156975,
    "longitude": 73.87092773,
    "totalBeds": 60,
    "erBeds": 15,
    "phone": "+91 20 7397746",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "N. M. Wadiya Institute of CardiologyCharitable Trust",
    "city": "pune",
    "latitude": 18.530461,
    "longitude": 73.8772286,
    "totalBeds": 181,
    "erBeds": 7,
    "phone": "+91 20 6649965",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Grant Medical Foundetion Ruby HollClinic",
    "city": "pune",
    "latitude": 18.5334009,
    "longitude": 73.87738058,
    "totalBeds": 194,
    "erBeds": 17,
    "phone": "+91 20 4756387",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Jehangir Hospital",
    "city": "pune",
    "latitude": 18.5302176,
    "longitude": 73.87686631,
    "totalBeds": 45,
    "erBeds": 10,
    "phone": "+91 20 8304275",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Gogate Eye Clinic",
    "city": "pune",
    "latitude": 18.5319958,
    "longitude": 73.87452667,
    "totalBeds": 49,
    "erBeds": 19,
    "phone": "+91 20 5028526",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kalekar Hospital",
    "city": "pune",
    "latitude": 18.5228262,
    "longitude": 73.86802192,
    "totalBeds": 205,
    "erBeds": 23,
    "phone": "+91 20 4537048",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Shree Hospital Criticare & TraumaCentre Pvt.Ltd.",
    "city": "pune",
    "latitude": 18.5515319,
    "longitude": 73.94122124,
    "totalBeds": 101,
    "erBeds": 8,
    "phone": "+91 20 5336990",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Medipoint Hospital",
    "city": "pune",
    "latitude": 18.5626131,
    "longitude": 73.93375615,
    "totalBeds": 215,
    "erBeds": 12,
    "phone": "+91 20 1812330",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kohkade Hospital",
    "city": "pune",
    "latitude": 18.5628385,
    "longitude": 73.93184179,
    "totalBeds": 98,
    "erBeds": 11,
    "phone": "+91 20 9092788",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Gold Rush Hospital",
    "city": "pune",
    "latitude": 18.5500917,
    "longitude": 73.93729302,
    "totalBeds": 75,
    "erBeds": 8,
    "phone": "+91 20 9116171",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Mrunmayee Health Cear Pvt. Ltd.(Sangamnerkar Hospital)",
    "city": "pune",
    "latitude": 18.561147,
    "longitude": 73.92141073,
    "totalBeds": 92,
    "erBeds": 24,
    "phone": "+91 20 8658936",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Katariya Hospital",
    "city": "pune",
    "latitude": 18.545521,
    "longitude": 73.88597036,
    "totalBeds": 146,
    "erBeds": 15,
    "phone": "+91 20 9719832",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Ct Nursing Home",
    "city": "pune",
    "latitude": 18.59711,
    "longitude": 73.90164403,
    "totalBeds": 103,
    "erBeds": 7,
    "phone": "+91 20 9853472",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Usha Kiran Hospital",
    "city": "pune",
    "latitude": 18.501784,
    "longitude": 73.93494269,
    "totalBeds": 189,
    "erBeds": 5,
    "phone": "+91 20 2646894",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sanjeevani Nursing Home",
    "city": "pune",
    "latitude": 18.5011756,
    "longitude": 73.94093173,
    "totalBeds": 57,
    "erBeds": 16,
    "phone": "+91 20 7076758",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Ratnadeep  Hospital",
    "city": "pune",
    "latitude": 18.5012793,
    "longitude": 73.93719252,
    "totalBeds": 183,
    "erBeds": 5,
    "phone": "+91 20 2762626",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sane Guruji Aarogya Kendra",
    "city": "pune",
    "latitude": 18.5034909,
    "longitude": 73.93810336,
    "totalBeds": 96,
    "erBeds": 6,
    "phone": "+91 20 1204786",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sahyadri Hospital Ltd, Hadapsar.",
    "city": "pune",
    "latitude": 18.5028683,
    "longitude": 73.92779919,
    "totalBeds": 22,
    "erBeds": 6,
    "phone": "+91 20 9480240",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sanjeevani Nursing Home",
    "city": "pune",
    "latitude": 18.5006386,
    "longitude": 73.94433468,
    "totalBeds": 155,
    "erBeds": 22,
    "phone": "+91 20 3661390",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Tupe Hospital",
    "city": "pune",
    "latitude": 18.5013038,
    "longitude": 73.93644002,
    "totalBeds": 204,
    "erBeds": 13,
    "phone": "+91 20 3006280",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Nobel  Hospital",
    "city": "pune",
    "latitude": 18.5033274,
    "longitude": 73.92731848,
    "totalBeds": 47,
    "erBeds": 8,
    "phone": "+91 20 4682192",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Noble Hospital",
    "city": "pune",
    "latitude": 18.5037415,
    "longitude": 73.92734033,
    "totalBeds": 131,
    "erBeds": 6,
    "phone": "+91 20 7787490",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Pbmas H.V.Desai Hospital",
    "city": "pune",
    "latitude": 18.4723273,
    "longitude": 73.9238448,
    "totalBeds": 63,
    "erBeds": 21,
    "phone": "+91 20 7397840",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Z Plus Accident Hospital & NursingHome",
    "city": "pune",
    "latitude": 18.5023763,
    "longitude": 73.93290466,
    "totalBeds": 63,
    "erBeds": 19,
    "phone": "+91 20 7592910",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Zanzurne Accident Hospital",
    "city": "pune",
    "latitude": 18.5018891,
    "longitude": 73.93301485,
    "totalBeds": 157,
    "erBeds": 9,
    "phone": "+91 20 3977461",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Vassan Eye Care Hospital",
    "city": "pune",
    "latitude": 18.5167739,
    "longitude": 73.93317104,
    "totalBeds": 55,
    "erBeds": 23,
    "phone": "+91 20 9742192",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Alatkar Hospital",
    "city": "pune",
    "latitude": 18.5019906,
    "longitude": 73.93256001,
    "totalBeds": 53,
    "erBeds": 16,
    "phone": "+91 20 9254735",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Tanmay Nursing Home",
    "city": "pune",
    "latitude": 18.5009897,
    "longitude": 73.94295797,
    "totalBeds": 82,
    "erBeds": 20,
    "phone": "+91 20 1652537",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Lotus Hospital",
    "city": "pune",
    "latitude": 18.5025203,
    "longitude": 73.93369804,
    "totalBeds": 157,
    "erBeds": 20,
    "phone": "+91 20 6617829",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Grant Medical Foundetion Ruby HollClinic- Wanovari",
    "city": "pune",
    "latitude": 18.4853169,
    "longitude": 73.90486796,
    "totalBeds": 111,
    "erBeds": 22,
    "phone": "+91 20 7205555",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Inamdar Hospital ( C.I.M.E.T.)",
    "city": "pune",
    "latitude": 18.5031819,
    "longitude": 73.90010216,
    "totalBeds": 71,
    "erBeds": 6,
    "phone": "+91 20 7264259",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Satyanand  Hospital",
    "city": "pune",
    "latitude": 18.4707934,
    "longitude": 73.88868992,
    "totalBeds": 67,
    "erBeds": 6,
    "phone": "+91 20 2671674",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sarwat Hospital",
    "city": "pune",
    "latitude": 18.4704972,
    "longitude": 73.88780422,
    "totalBeds": 93,
    "erBeds": 8,
    "phone": "+91 20 9857675",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Navjeevan Nursing Home",
    "city": "pune",
    "latitude": 18.4862815,
    "longitude": 73.93103888,
    "totalBeds": 178,
    "erBeds": 12,
    "phone": "+91 20 6954523",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Chordiya Nursing Home",
    "city": "pune",
    "latitude": 18.466031,
    "longitude": 73.86396181,
    "totalBeds": 56,
    "erBeds": 6,
    "phone": "+91 20 4944675",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Pawar Hospital",
    "city": "pune",
    "latitude": 18.465905,
    "longitude": 73.86010142,
    "totalBeds": 201,
    "erBeds": 16,
    "phone": "+91 20 7959970",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sidhhi Hospital Laproscopy Center",
    "city": "pune",
    "latitude": 18.4642915,
    "longitude": 73.85931902,
    "totalBeds": 132,
    "erBeds": 16,
    "phone": "+91 20 5864454",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Yashshree Maternity & Nursing Home",
    "city": "pune",
    "latitude": 18.4898166,
    "longitude": 73.85004897,
    "totalBeds": 173,
    "erBeds": 16,
    "phone": "+91 20 7552057",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Mother Home Fartility Clinic",
    "city": "pune",
    "latitude": 18.4891233,
    "longitude": 73.85703134,
    "totalBeds": 46,
    "erBeds": 22,
    "phone": "+91 20 1080902",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Zanwar Eye Hospital",
    "city": "pune",
    "latitude": 18.4890425,
    "longitude": 73.85703449,
    "totalBeds": 73,
    "erBeds": 15,
    "phone": "+91 20 4522116",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bharti Hospital",
    "city": "pune",
    "latitude": 18.4589235,
    "longitude": 73.85678324,
    "totalBeds": 206,
    "erBeds": 23,
    "phone": "+91 20 3804722",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Disha Nursing Home",
    "city": "pune",
    "latitude": 18.4663047,
    "longitude": 73.85234715,
    "totalBeds": 49,
    "erBeds": 13,
    "phone": "+91 20 4196743",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bharti Hospital",
    "city": "pune",
    "latitude": 18.4593206,
    "longitude": 73.85725687,
    "totalBeds": 211,
    "erBeds": 7,
    "phone": "+91 20 9270064",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kothari Hospital",
    "city": "pune",
    "latitude": 18.4868036,
    "longitude": 73.85720785,
    "totalBeds": 178,
    "erBeds": 9,
    "phone": "+91 20 3948682",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Anand Hospital",
    "city": "pune",
    "latitude": 18.4654492,
    "longitude": 73.85057513,
    "totalBeds": 137,
    "erBeds": 19,
    "phone": "+91 20 1713233",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Chaitanya Nursing Home",
    "city": "pune",
    "latitude": 18.4653789,
    "longitude": 73.85251713,
    "totalBeds": 164,
    "erBeds": 21,
    "phone": "+91 20 7495820",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bharti Homeopathic Hospital",
    "city": "pune",
    "latitude": 18.4588916,
    "longitude": 73.85680646,
    "totalBeds": 198,
    "erBeds": 19,
    "phone": "+91 20 1081964",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Modi Clinic",
    "city": "pune",
    "latitude": 18.4654574,
    "longitude": 73.85641785,
    "totalBeds": 124,
    "erBeds": 24,
    "phone": "+91 20 2292334",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bharti Ayurved Hospital",
    "city": "pune",
    "latitude": 18.4589627,
    "longitude": 73.85625754,
    "totalBeds": 30,
    "erBeds": 23,
    "phone": "+91 20 6213016",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Shahade Hospital",
    "city": "pune",
    "latitude": 18.4980417,
    "longitude": 73.85384566,
    "totalBeds": 112,
    "erBeds": 8,
    "phone": "+91 20 2350362",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Laxmi Clinc",
    "city": "pune",
    "latitude": 18.5136354,
    "longitude": 73.84559137,
    "totalBeds": 127,
    "erBeds": 18,
    "phone": "+91 20 8375978",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Deshmukh Hospital",
    "city": "pune",
    "latitude": 18.5034889,
    "longitude": 73.8565846,
    "totalBeds": 23,
    "erBeds": 11,
    "phone": "+91 20 4806849",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Jabde Hospital",
    "city": "pune",
    "latitude": 18.5189179,
    "longitude": 73.85948013,
    "totalBeds": 181,
    "erBeds": 21,
    "phone": "+91 20 9445587",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Colony Nursing Home",
    "city": "pune",
    "latitude": 18.5014524,
    "longitude": 73.84781933,
    "totalBeds": 208,
    "erBeds": 15,
    "phone": "+91 20 2217520",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Purandare Maternity Home",
    "city": "pune",
    "latitude": 18.5023695,
    "longitude": 73.85865433,
    "totalBeds": 99,
    "erBeds": 11,
    "phone": "+91 20 8204212",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Tarabai Limye Hospital",
    "city": "pune",
    "latitude": 18.5142345,
    "longitude": 73.8494506,
    "totalBeds": 63,
    "erBeds": 10,
    "phone": "+91 20 9248602",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Paranjpe Gynae Hospital",
    "city": "pune",
    "latitude": 18.5115989,
    "longitude": 73.84595553,
    "totalBeds": 212,
    "erBeds": 15,
    "phone": "+91 20 4742158",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Laxmi Prasutigruh & Jeevan JoytiHospital",
    "city": "pune",
    "latitude": 18.511929,
    "longitude": 73.85450819,
    "totalBeds": 137,
    "erBeds": 13,
    "phone": "+91 20 4595818",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Surya Hospital Pvt. Ltd. SuryaSahaydri Hospital",
    "city": "pune",
    "latitude": 18.5215923,
    "longitude": 73.85579984,
    "totalBeds": 213,
    "erBeds": 21,
    "phone": "+91 20 4479244",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Parvati Netra Chikitsalya",
    "city": "pune",
    "latitude": 18.507293,
    "longitude": 73.85177932,
    "totalBeds": 138,
    "erBeds": 5,
    "phone": "+91 20 6263306",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "N. M. Wadia Hospital",
    "city": "pune",
    "latitude": 18.5071685,
    "longitude": 73.85499234,
    "totalBeds": 167,
    "erBeds": 13,
    "phone": "+91 20 5066609",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Harjeevan Hospital",
    "city": "pune",
    "latitude": 18.5001426,
    "longitude": 73.85408736,
    "totalBeds": 85,
    "erBeds": 15,
    "phone": "+91 20 8877719",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Manoj Clinic",
    "city": "pune",
    "latitude": 18.5114385,
    "longitude": 73.84876844,
    "totalBeds": 70,
    "erBeds": 19,
    "phone": "+91 20 8989311",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Aashtang Ayurved Rugnalaya",
    "city": "pune",
    "latitude": 18.5069646,
    "longitude": 73.85072195,
    "totalBeds": 109,
    "erBeds": 10,
    "phone": "+91 20 1854901",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Purohit Maternity Hospital",
    "city": "pune",
    "latitude": 18.497601,
    "longitude": 73.85210745,
    "totalBeds": 202,
    "erBeds": 9,
    "phone": "+91 20 6935481",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Chinmay Nursing Home",
    "city": "pune",
    "latitude": 18.5066159,
    "longitude": 73.84475521,
    "totalBeds": 105,
    "erBeds": 11,
    "phone": "+91 20 8688296",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Niranjan Nursing Home",
    "city": "pune",
    "latitude": 18.5102768,
    "longitude": 73.85264344,
    "totalBeds": 145,
    "erBeds": 12,
    "phone": "+91 20 7362126",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sharada Clinic Shaishav Clinic",
    "city": "pune",
    "latitude": 18.5137981,
    "longitude": 73.84772473,
    "totalBeds": 121,
    "erBeds": 12,
    "phone": "+91 20 8512889",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Day Care  Orthopedic Hospital",
    "city": "pune",
    "latitude": 18.506127,
    "longitude": 73.85389021,
    "totalBeds": 77,
    "erBeds": 18,
    "phone": "+91 20 7759211",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Ent Hospital",
    "city": "pune",
    "latitude": 18.4965233,
    "longitude": 73.85438072,
    "totalBeds": 82,
    "erBeds": 12,
    "phone": "+91 20 4123001",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Surgical Nursing Home",
    "city": "pune",
    "latitude": 18.5034406,
    "longitude": 73.85222131,
    "totalBeds": 155,
    "erBeds": 15,
    "phone": "+91 20 1023720",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sutika Seva Mandir",
    "city": "pune",
    "latitude": 18.5139169,
    "longitude": 73.84640123,
    "totalBeds": 164,
    "erBeds": 18,
    "phone": "+91 20 8513663",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr.Ketkar Ent Hospital",
    "city": "pune",
    "latitude": 18.5145113,
    "longitude": 73.84702507,
    "totalBeds": 74,
    "erBeds": 10,
    "phone": "+91 20 9168654",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Mahatma Gandhi Hospital",
    "city": "pune",
    "latitude": 18.5127056,
    "longitude": 73.84419483,
    "totalBeds": 46,
    "erBeds": 14,
    "phone": "+91 20 7516889",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr.Patankar Medical Foundetion &Patankar Hospital Pvt. Ltd.",
    "city": "pune",
    "latitude": 18.5003435,
    "longitude": 73.85430306,
    "totalBeds": 203,
    "erBeds": 18,
    "phone": "+91 20 6881175",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Chitale Ent Hospital",
    "city": "pune",
    "latitude": 18.5061689,
    "longitude": 73.85289289,
    "totalBeds": 182,
    "erBeds": 16,
    "phone": "+91 20 7006884",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Jijamata Hospital",
    "city": "pune",
    "latitude": 18.5192632,
    "longitude": 73.85714533,
    "totalBeds": 67,
    "erBeds": 21,
    "phone": "+91 20 5454894",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Universal Hospital",
    "city": "pune",
    "latitude": 18.5215002,
    "longitude": 73.85566468,
    "totalBeds": 86,
    "erBeds": 11,
    "phone": "+91 20 7877822",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Lokmanya Hospital Pvt. Ltd.",
    "city": "pune",
    "latitude": 18.4959852,
    "longitude": 73.85427766,
    "totalBeds": 209,
    "erBeds": 8,
    "phone": "+91 20 1682899",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Anand Maternity & Nursing Home",
    "city": "pune",
    "latitude": 18.5054941,
    "longitude": 73.85053047,
    "totalBeds": 184,
    "erBeds": 14,
    "phone": "+91 20 3240170",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sammohini Clinic",
    "city": "pune",
    "latitude": 18.5079993,
    "longitude": 73.8430136,
    "totalBeds": 86,
    "erBeds": 8,
    "phone": "+91 20 4152602",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Gokhale Hospital",
    "city": "pune",
    "latitude": 18.5023373,
    "longitude": 73.8568698,
    "totalBeds": 38,
    "erBeds": 15,
    "phone": "+91 20 5261493",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Ranade Hospital",
    "city": "pune",
    "latitude": 18.5121401,
    "longitude": 73.84916807,
    "totalBeds": 68,
    "erBeds": 10,
    "phone": "+91 20 3615525",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Lathi Hospital & Surgical NursingHome",
    "city": "pune",
    "latitude": 18.5146524,
    "longitude": 73.85000965,
    "totalBeds": 165,
    "erBeds": 13,
    "phone": "+91 20 3068632",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Godbole Hospital",
    "city": "pune",
    "latitude": 18.5111808,
    "longitude": 73.85138735,
    "totalBeds": 195,
    "erBeds": 11,
    "phone": "+91 20 6216434",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kelkar Pediatric Hospital (Children)",
    "city": "pune",
    "latitude": 18.503906,
    "longitude": 73.85571762,
    "totalBeds": 116,
    "erBeds": 14,
    "phone": "+91 20 4781496",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Shintre Hospital",
    "city": "pune",
    "latitude": 18.5121989,
    "longitude": 73.849542,
    "totalBeds": 217,
    "erBeds": 18,
    "phone": "+91 20 5590017",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Nursing Home",
    "city": "pune",
    "latitude": 18.512151,
    "longitude": 73.84953817,
    "totalBeds": 70,
    "erBeds": 16,
    "phone": "+91 20 9091724",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Amey Nursing Home",
    "city": "pune",
    "latitude": 18.5059518,
    "longitude": 73.85677009,
    "totalBeds": 177,
    "erBeds": 9,
    "phone": "+91 20 6971907",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Poona Hospital & Reasarch Center",
    "city": "pune",
    "latitude": 18.5110196,
    "longitude": 73.8424597,
    "totalBeds": 202,
    "erBeds": 19,
    "phone": "+91 20 3318076",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Khurd Maternity Home",
    "city": "pune",
    "latitude": 18.5157111,
    "longitude": 73.85615119,
    "totalBeds": 109,
    "erBeds": 17,
    "phone": "+91 20 3432094",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Asha Kiran Hospital",
    "city": "pune",
    "latitude": 18.5159023,
    "longitude": 73.84746873,
    "totalBeds": 160,
    "erBeds": 8,
    "phone": "+91 20 9816050",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bidaye Hospital Pvt.Ltd.",
    "city": "pune",
    "latitude": 18.5091951,
    "longitude": 73.84522332,
    "totalBeds": 166,
    "erBeds": 13,
    "phone": "+91 20 5916132",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Pabalkar Nursing Home",
    "city": "pune",
    "latitude": 18.5061852,
    "longitude": 73.8565195,
    "totalBeds": 209,
    "erBeds": 22,
    "phone": "+91 20 7550271",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Chavan Nursing Home",
    "city": "pune",
    "latitude": 18.5019594,
    "longitude": 73.85852748,
    "totalBeds": 119,
    "erBeds": 16,
    "phone": "+91 20 2911113",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Yashwant Eye Clinic & Hospital",
    "city": "pune",
    "latitude": 18.4968902,
    "longitude": 73.85448405,
    "totalBeds": 95,
    "erBeds": 11,
    "phone": "+91 20 4568485",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sathe Eye Clinic, Day Care Clinic",
    "city": "pune",
    "latitude": 18.5138288,
    "longitude": 73.84498919,
    "totalBeds": 86,
    "erBeds": 21,
    "phone": "+91 20 4224208",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Ramkrishna  Hospital",
    "city": "pune",
    "latitude": 18.5093475,
    "longitude": 73.84820333,
    "totalBeds": 90,
    "erBeds": 20,
    "phone": "+91 20 9064571",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Samarth Hospital",
    "city": "pune",
    "latitude": 18.5195018,
    "longitude": 73.8621055,
    "totalBeds": 72,
    "erBeds": 11,
    "phone": "+91 20 2870348",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dhanwantari Hospital",
    "city": "pune",
    "latitude": 18.5193877,
    "longitude": 73.86637561,
    "totalBeds": 67,
    "erBeds": 12,
    "phone": "+91 20 1347719",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "S.P. Deshpande Eye Clinic",
    "city": "pune",
    "latitude": 18.5157878,
    "longitude": 73.8470853,
    "totalBeds": 205,
    "erBeds": 19,
    "phone": "+91 20 4867188",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Vibhute Hospital",
    "city": "pune",
    "latitude": 18.504137,
    "longitude": 73.85165049,
    "totalBeds": 58,
    "erBeds": 12,
    "phone": "+91 20 3838129",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Parvati General Hospital",
    "city": "pune",
    "latitude": 18.4983245,
    "longitude": 73.85055828,
    "totalBeds": 139,
    "erBeds": 21,
    "phone": "+91 20 5822648",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bhide Hospital Orthopedic Divission",
    "city": "pune",
    "latitude": 18.5048664,
    "longitude": 73.8443334,
    "totalBeds": 33,
    "erBeds": 23,
    "phone": "+91 20 4195558",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Lapro Obeso Center",
    "city": "pune",
    "latitude": 18.5044878,
    "longitude": 73.85108619,
    "totalBeds": 102,
    "erBeds": 23,
    "phone": "+91 20 3063153",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Netra Seva Kendra (Jan Kalyan EyeBank)",
    "city": "pune",
    "latitude": 18.5146832,
    "longitude": 73.84726299,
    "totalBeds": 102,
    "erBeds": 21,
    "phone": "+91 20 8626214",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sarswati Vilas Hospital",
    "city": "pune",
    "latitude": 18.5145037,
    "longitude": 73.85175613,
    "totalBeds": 52,
    "erBeds": 23,
    "phone": "+91 20 8327862",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bhide Hospital Balrog Vibhag",
    "city": "pune",
    "latitude": 18.5048168,
    "longitude": 73.84430481,
    "totalBeds": 175,
    "erBeds": 20,
    "phone": "+91 20 4724338",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Yogesh Hospital",
    "city": "pune",
    "latitude": 18.5104292,
    "longitude": 73.84786016,
    "totalBeds": 133,
    "erBeds": 18,
    "phone": "+91 20 5110798",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Date Hospital",
    "city": "pune",
    "latitude": 18.4962318,
    "longitude": 73.85374921,
    "totalBeds": 181,
    "erBeds": 5,
    "phone": "+91 20 6024471",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Gandhi Accident & General Hospital",
    "city": "pune",
    "latitude": 18.5173963,
    "longitude": 73.84715994,
    "totalBeds": 61,
    "erBeds": 21,
    "phone": "+91 20 7339339",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Date Hospital",
    "city": "pune",
    "latitude": 18.5097097,
    "longitude": 73.85237477,
    "totalBeds": 150,
    "erBeds": 24,
    "phone": "+91 20 7947137",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Eye Hospital (Dr. Bhat's Eye CareCenter)",
    "city": "pune",
    "latitude": 18.5134975,
    "longitude": 73.84590853,
    "totalBeds": 94,
    "erBeds": 9,
    "phone": "+91 20 4918396",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "K.E.M. Hospital",
    "city": "pune",
    "latitude": 18.5198093,
    "longitude": 73.86724329,
    "totalBeds": 150,
    "erBeds": 24,
    "phone": "+91 20 9903951",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Ashwini Hospital",
    "city": "pune",
    "latitude": 18.5061837,
    "longitude": 73.8443349,
    "totalBeds": 106,
    "erBeds": 16,
    "phone": "+91 20 7413308",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Saikrupa Nursing Home",
    "city": "pune",
    "latitude": 18.5165182,
    "longitude": 73.84771221,
    "totalBeds": 161,
    "erBeds": 6,
    "phone": "+91 20 8129103",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Chandrama Clinic",
    "city": "pune",
    "latitude": 18.508608,
    "longitude": 73.8457036,
    "totalBeds": 68,
    "erBeds": 24,
    "phone": "+91 20 6566064",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Aadhar Hospital",
    "city": "pune",
    "latitude": 18.4935942,
    "longitude": 73.85034467,
    "totalBeds": 51,
    "erBeds": 11,
    "phone": "+91 20 1243284",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Shantalaxmi Clinic",
    "city": "pune",
    "latitude": 18.5086763,
    "longitude": 73.85500388,
    "totalBeds": 181,
    "erBeds": 9,
    "phone": "+91 20 9795342",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Bhange's Eye Day Care Center",
    "city": "pune",
    "latitude": 18.5086631,
    "longitude": 73.85503866,
    "totalBeds": 78,
    "erBeds": 7,
    "phone": "+91 20 3905122",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Nova Pluse Ivf Clinic Pvt. Ltd.",
    "city": "pune",
    "latitude": 18.5029712,
    "longitude": 73.8521089,
    "totalBeds": 214,
    "erBeds": 14,
    "phone": "+91 20 4619495",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Neo Hospital",
    "city": "pune",
    "latitude": 18.5061368,
    "longitude": 73.8522629,
    "totalBeds": 128,
    "erBeds": 21,
    "phone": "+91 20 3307032",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Chaitanya Eye Clinic & Phaco Centre",
    "city": "pune",
    "latitude": 18.516541,
    "longitude": 73.85158874,
    "totalBeds": 186,
    "erBeds": 12,
    "phone": "+91 20 7169815",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Apolo Speciality Hospitals Pvt. Ltd.",
    "city": "pune",
    "latitude": 18.5029266,
    "longitude": 73.85210357,
    "totalBeds": 80,
    "erBeds": 12,
    "phone": "+91 20 3515921",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Children Hospital",
    "city": "pune",
    "latitude": 18.5188041,
    "longitude": 73.86023877,
    "totalBeds": 176,
    "erBeds": 7,
    "phone": "+91 20 9644891",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Aliance Munot Hospital",
    "city": "pune",
    "latitude": 18.501787,
    "longitude": 73.86921741,
    "totalBeds": 176,
    "erBeds": 13,
    "phone": "+91 20 7198202",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sharada Clinic",
    "city": "pune",
    "latitude": 18.5012305,
    "longitude": 73.86635352,
    "totalBeds": 52,
    "erBeds": 23,
    "phone": "+91 20 2584356",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Naik Orthopadic Hospital",
    "city": "pune",
    "latitude": 18.5103848,
    "longitude": 73.85943727,
    "totalBeds": 67,
    "erBeds": 12,
    "phone": "+91 20 9486910",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Wagdarikar Hospital",
    "city": "pune",
    "latitude": 18.5177589,
    "longitude": 73.8587391,
    "totalBeds": 91,
    "erBeds": 7,
    "phone": "+91 20 4639638",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Meera Hospital",
    "city": "pune",
    "latitude": 18.502236,
    "longitude": 73.8747181,
    "totalBeds": 142,
    "erBeds": 19,
    "phone": "+91 20 3902638",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Yashada Hospital",
    "city": "pune",
    "latitude": 18.5162507,
    "longitude": 73.86153084,
    "totalBeds": 215,
    "erBeds": 20,
    "phone": "+91 20 3666909",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sheth Tarachand RamanathCharitable Aurvedic Hospital",
    "city": "pune",
    "latitude": 18.5179954,
    "longitude": 73.86448721,
    "totalBeds": 144,
    "erBeds": 5,
    "phone": "+91 20 2134413",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Patil Hospital",
    "city": "pune",
    "latitude": 18.4791546,
    "longitude": 73.82480223,
    "totalBeds": 117,
    "erBeds": 10,
    "phone": "+91 20 6202620",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Wadekar Nursing Home (MaternityHome & Dispensary)",
    "city": "pune",
    "latitude": 18.472983,
    "longitude": 73.81941069,
    "totalBeds": 210,
    "erBeds": 24,
    "phone": "+91 20 9565224",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Adate General Hospital",
    "city": "pune",
    "latitude": 18.4627945,
    "longitude": 73.81436613,
    "totalBeds": 151,
    "erBeds": 19,
    "phone": "+91 20 6329210",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Karawa Hospital MaternitySurgical & General Hospital",
    "city": "pune",
    "latitude": 18.5009427,
    "longitude": 73.84611344,
    "totalBeds": 47,
    "erBeds": 17,
    "phone": "+91 20 2205757",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Trimurti Hospital",
    "city": "pune",
    "latitude": 18.4621095,
    "longitude": 73.81491098,
    "totalBeds": 207,
    "erBeds": 20,
    "phone": "+91 20 1419571",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Ashirwad Hospital",
    "city": "pune",
    "latitude": 18.4797357,
    "longitude": 73.82834751,
    "totalBeds": 48,
    "erBeds": 24,
    "phone": "+91 20 6134029",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Rakshak Multi Specility Hospital",
    "city": "pune",
    "latitude": 18.4643487,
    "longitude": 73.81532899,
    "totalBeds": 73,
    "erBeds": 14,
    "phone": "+91 20 7772644",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Madhukar General Hospital",
    "city": "pune",
    "latitude": 18.4788986,
    "longitude": 73.82411119,
    "totalBeds": 32,
    "erBeds": 24,
    "phone": "+91 20 7304427",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Jagtap Hospital",
    "city": "pune",
    "latitude": 18.4774274,
    "longitude": 73.82381146,
    "totalBeds": 195,
    "erBeds": 9,
    "phone": "+91 20 1178674",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sadguru Nursing Home",
    "city": "pune",
    "latitude": 18.480586,
    "longitude": 73.82951492,
    "totalBeds": 32,
    "erBeds": 11,
    "phone": "+91 20 6864291",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Parvati General Hospital",
    "city": "pune",
    "latitude": 18.5007037,
    "longitude": 73.84619906,
    "totalBeds": 183,
    "erBeds": 5,
    "phone": "+91 20 9890500",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Pharande Eye Hospital & PhacoCenter",
    "city": "pune",
    "latitude": 18.4777778,
    "longitude": 73.82399111,
    "totalBeds": 25,
    "erBeds": 7,
    "phone": "+91 20 2407955",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sharad Hospital",
    "city": "pune",
    "latitude": 18.4684337,
    "longitude": 73.81891139,
    "totalBeds": 50,
    "erBeds": 15,
    "phone": "+91 20 7812605",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Mahrashtra Medical Foundetion JoshiHosptial",
    "city": "pune",
    "latitude": 18.5171774,
    "longitude": 73.83323065,
    "totalBeds": 183,
    "erBeds": 16,
    "phone": "+91 20 6489907",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sathe Hospital",
    "city": "pune",
    "latitude": 18.5154496,
    "longitude": 73.84194242,
    "totalBeds": 72,
    "erBeds": 15,
    "phone": "+91 20 5168353",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Hrishikesh Healthcare Pvt. Ltd.",
    "city": "pune",
    "latitude": 18.5164131,
    "longitude": 73.84213022,
    "totalBeds": 106,
    "erBeds": 21,
    "phone": "+91 20 2951316",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sushrut  Hospital",
    "city": "pune",
    "latitude": 18.5302359,
    "longitude": 73.84758768,
    "totalBeds": 55,
    "erBeds": 16,
    "phone": "+91 20 7333078",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sanjeevan Surgery/ Atharva Netralaya& Reserch Centre",
    "city": "pune",
    "latitude": 18.5246082,
    "longitude": 73.84237112,
    "totalBeds": 205,
    "erBeds": 13,
    "phone": "+91 20 1520071",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Ghaisas Ent Hospital",
    "city": "pune",
    "latitude": 18.5172985,
    "longitude": 73.84236323,
    "totalBeds": 45,
    "erBeds": 19,
    "phone": "+91 20 6206138",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Atharv Hospital",
    "city": "pune",
    "latitude": 18.53119,
    "longitude": 73.84731013,
    "totalBeds": 162,
    "erBeds": 21,
    "phone": "+91 20 7215669",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Vision Next",
    "city": "pune",
    "latitude": 18.520531,
    "longitude": 73.84417413,
    "totalBeds": 172,
    "erBeds": 23,
    "phone": "+91 20 8230866",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Wachasunder Ent Clinic",
    "city": "pune",
    "latitude": 18.5326896,
    "longitude": 73.84288448,
    "totalBeds": 173,
    "erBeds": 8,
    "phone": "+91 20 1927650",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Nursing Home",
    "city": "pune",
    "latitude": 18.5284586,
    "longitude": 73.84942951,
    "totalBeds": 182,
    "erBeds": 11,
    "phone": "+91 20 2252251",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Maharashtra Medical FoundetionRatna Memorial Hospital",
    "city": "pune",
    "latitude": 18.5276913,
    "longitude": 73.82960304,
    "totalBeds": 138,
    "erBeds": 23,
    "phone": "+91 20 5165657",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dabake Maternity & General NursingHome",
    "city": "pune",
    "latitude": 18.5123551,
    "longitude": 73.83818309,
    "totalBeds": 59,
    "erBeds": 5,
    "phone": "+91 20 4624842",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Gupte Hospital of Acurate DaigonesticPvt.Ltd.",
    "city": "pune",
    "latitude": 18.5184926,
    "longitude": 73.83988249,
    "totalBeds": 41,
    "erBeds": 18,
    "phone": "+91 20 5048900",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Polyclinic & Hospital",
    "city": "pune",
    "latitude": 18.5228462,
    "longitude": 73.85107889,
    "totalBeds": 109,
    "erBeds": 13,
    "phone": "+91 20 5001818",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Konkan Mitra Mandal Trust's SahyadriSpeciality Hospital",
    "city": "pune",
    "latitude": 18.513101,
    "longitude": 73.83929666,
    "totalBeds": 122,
    "erBeds": 19,
    "phone": "+91 20 8334418",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Accurate Diagnostic Pvt. Ltd.",
    "city": "pune",
    "latitude": 18.5194333,
    "longitude": 73.83997699,
    "totalBeds": 121,
    "erBeds": 23,
    "phone": "+91 20 6478617",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Center For Joint Repleacment Surgary",
    "city": "pune",
    "latitude": 18.5297972,
    "longitude": 73.85262256,
    "totalBeds": 149,
    "erBeds": 13,
    "phone": "+91 20 2617756",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Shreeyash Hospital",
    "city": "pune",
    "latitude": 18.5158584,
    "longitude": 73.84188041,
    "totalBeds": 190,
    "erBeds": 7,
    "phone": "+91 20 8293375",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sancheti Institute For Orthopedic &Rehabilitaion",
    "city": "pune",
    "latitude": 18.529803,
    "longitude": 73.85304012,
    "totalBeds": 171,
    "erBeds": 10,
    "phone": "+91 20 3379171",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Surgical & General Nursing Home",
    "city": "pune",
    "latitude": 18.5246144,
    "longitude": 73.84984613,
    "totalBeds": 143,
    "erBeds": 11,
    "phone": "+91 20 4884273",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Deendayal Memorial Hospital",
    "city": "pune",
    "latitude": 18.5246973,
    "longitude": 73.84113306,
    "totalBeds": 147,
    "erBeds": 7,
    "phone": "+91 20 3530291",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Suraj Hospital",
    "city": "pune",
    "latitude": 18.5257487,
    "longitude": 73.85271316,
    "totalBeds": 201,
    "erBeds": 21,
    "phone": "+91 20 5745083",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Deccan Center",
    "city": "pune",
    "latitude": 18.5189549,
    "longitude": 73.84463076,
    "totalBeds": 124,
    "erBeds": 11,
    "phone": "+91 20 3556520",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Prashant Hospital Maternity &General Hospital",
    "city": "pune",
    "latitude": 18.5241744,
    "longitude": 73.84353928,
    "totalBeds": 152,
    "erBeds": 8,
    "phone": "+91 20 3434305",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Oyster  & Pearl Hospital Pvt.Ltd.",
    "city": "pune",
    "latitude": 18.5319151,
    "longitude": 73.84731079,
    "totalBeds": 101,
    "erBeds": 20,
    "phone": "+91 20 4417469",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Oyster  & Pearl Tulip  Hospital",
    "city": "pune",
    "latitude": 18.5294331,
    "longitude": 73.82849362,
    "totalBeds": 34,
    "erBeds": 13,
    "phone": "+91 20 8777765",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Manohar Joshi Memorial Hospital",
    "city": "pune",
    "latitude": 18.5244702,
    "longitude": 73.84362612,
    "totalBeds": 81,
    "erBeds": 24,
    "phone": "+91 20 8647898",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kelkar Hospital",
    "city": "pune",
    "latitude": 18.5238131,
    "longitude": 73.84701137,
    "totalBeds": 219,
    "erBeds": 17,
    "phone": "+91 20 3910164",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sakhi Clinic",
    "city": "pune",
    "latitude": 18.5293097,
    "longitude": 73.84328456,
    "totalBeds": 28,
    "erBeds": 8,
    "phone": "+91 20 6576452",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Kothari Accident Hospital",
    "city": "pune",
    "latitude": 18.5216956,
    "longitude": 73.84521143,
    "totalBeds": 57,
    "erBeds": 13,
    "phone": "+91 20 1974548",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Vision Next",
    "city": "pune",
    "latitude": 18.5205916,
    "longitude": 73.84398172,
    "totalBeds": 162,
    "erBeds": 15,
    "phone": "+91 20 9879848",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Arun Limaye Memorial Nandadip Hospital & Resarch Center Pvt. Ltd.",
    "city": "pune",
    "latitude": 18.5254842,
    "longitude": 73.84185157,
    "totalBeds": 36,
    "erBeds": 18,
    "phone": "+91 20 8290200",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Pearl Womens Hospital & Yash Ivf`",
    "city": "pune",
    "latitude": 18.5178319,
    "longitude": 73.84438467,
    "totalBeds": 187,
    "erBeds": 20,
    "phone": "+91 20 4799505",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Pioneer Medilesar Pvt. Ltd.",
    "city": "pune",
    "latitude": 18.5252102,
    "longitude": 73.84180896,
    "totalBeds": 150,
    "erBeds": 24,
    "phone": "+91 20 1413142",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kids Clinic (I) Pvt. Ltd. Cloud NineHospital",
    "city": "pune",
    "latitude": 18.5335351,
    "longitude": 73.84718891,
    "totalBeds": 33,
    "erBeds": 5,
    "phone": "+91 20 8392676",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kaluskar Hospital & Laboretory",
    "city": "pune",
    "latitude": 18.5226483,
    "longitude": 73.84778341,
    "totalBeds": 154,
    "erBeds": 21,
    "phone": "+91 20 4371468",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Phadke Hospital",
    "city": "pune",
    "latitude": 18.5181324,
    "longitude": 73.84390052,
    "totalBeds": 70,
    "erBeds": 5,
    "phone": "+91 20 8560288",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Lokmanya Hospital",
    "city": "pune",
    "latitude": 18.5100547,
    "longitude": 73.83588457,
    "totalBeds": 204,
    "erBeds": 15,
    "phone": "+91 20 1108109",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Nanal Hospital",
    "city": "pune",
    "latitude": 18.5114677,
    "longitude": 73.83728408,
    "totalBeds": 24,
    "erBeds": 10,
    "phone": "+91 20 2240145",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dwidal Nursing Home",
    "city": "pune",
    "latitude": 18.5093097,
    "longitude": 73.83614629,
    "totalBeds": 61,
    "erBeds": 19,
    "phone": "+91 20 7836267",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Galaxcy Care Laproscopy Institute Pvt.Ltd.",
    "city": "pune",
    "latitude": 18.5114185,
    "longitude": 73.83722626,
    "totalBeds": 94,
    "erBeds": 8,
    "phone": "+91 20 5345121",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Amey Clinic Maternity & GynaeSurgical Home",
    "city": "pune",
    "latitude": 18.5037095,
    "longitude": 73.82878358,
    "totalBeds": 91,
    "erBeds": 11,
    "phone": "+91 20 2678799",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Madhavrao Rande Memorial Hospital(Sanjivan Hospital)",
    "city": "pune",
    "latitude": 18.5102083,
    "longitude": 73.83704621,
    "totalBeds": 133,
    "erBeds": 6,
    "phone": "+91 20 9469086",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dhodu Mama Sathe HospitalVaidykiya Mahavidyalaya",
    "city": "pune",
    "latitude": 18.5098442,
    "longitude": 73.83679248,
    "totalBeds": 180,
    "erBeds": 9,
    "phone": "+91 20 9781892",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Deodhar Eyes Hospital",
    "city": "pune",
    "latitude": 18.5114617,
    "longitude": 73.83643808,
    "totalBeds": 189,
    "erBeds": 7,
    "phone": "+91 20 9219454",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Shashwat Health Pvt.Ltd ShashwatHospital.",
    "city": "pune",
    "latitude": 18.4948393,
    "longitude": 73.81359283,
    "totalBeds": 134,
    "erBeds": 8,
    "phone": "+91 20 3539814",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Lata Mangeshkar MedicalFoundation's Mai Mangeshkar Hospital",
    "city": "pune",
    "latitude": 18.4851605,
    "longitude": 73.79978785,
    "totalBeds": 162,
    "erBeds": 15,
    "phone": "+91 20 9312229",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Nachiket Hospital",
    "city": "pune",
    "latitude": 18.5092237,
    "longitude": 73.83162954,
    "totalBeds": 105,
    "erBeds": 12,
    "phone": "+91 20 2603078",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Deenannath Mangeshkar Hospital",
    "city": "pune",
    "latitude": 18.5019056,
    "longitude": 73.83313987,
    "totalBeds": 129,
    "erBeds": 16,
    "phone": "+91 20 5552277",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Vinayak Hospital",
    "city": "pune",
    "latitude": 18.4856366,
    "longitude": 73.79677714,
    "totalBeds": 219,
    "erBeds": 15,
    "phone": "+91 20 8721032",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Prabhu Desai Eye Clinic",
    "city": "pune",
    "latitude": 18.5009612,
    "longitude": 73.82031088,
    "totalBeds": 73,
    "erBeds": 13,
    "phone": "+91 20 4751110",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Janani Nursing Home",
    "city": "pune",
    "latitude": 18.4947657,
    "longitude": 73.81356017,
    "totalBeds": 71,
    "erBeds": 5,
    "phone": "+91 20 6614644",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Jayabai Nanasaheb Sutar Maternity Home",
    "city": "pune",
    "latitude": 18.503652,
    "longitude": 73.807762,
    "totalBeds": 292,
    "erBeds": 18,
    "phone": "+91 20 4930925",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Sundarabai Ganpatrao Raut Dawakhana",
    "city": "pune",
    "latitude": 18.511578,
    "longitude": 73.820137,
    "totalBeds": 251,
    "erBeds": 47,
    "phone": "+91 20 7018590",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Sanjay Gandhi Maternity Home",
    "city": "pune",
    "latitude": 18.571104,
    "longitude": 73.838294,
    "totalBeds": 152,
    "erBeds": 21,
    "phone": "+91 20 4530637",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Sahadev Eknath Nimhan Maternity Home",
    "city": "pune",
    "latitude": 18.537722,
    "longitude": 73.795979,
    "totalBeds": 523,
    "erBeds": 40,
    "phone": "+91 20 2707592",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Aundh Kuti Maternity Home",
    "city": "pune",
    "latitude": 18.562805,
    "longitude": 73.810015,
    "totalBeds": 547,
    "erBeds": 41,
    "phone": "+91 20 9196674",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Baburao Genba Shevale Dawakhana",
    "city": "pune",
    "latitude": 18.562739,
    "longitude": 73.832653,
    "totalBeds": 478,
    "erBeds": 30,
    "phone": "+91 20 5315266",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Indumati Manilal Khanna Dawakhana",
    "city": "pune",
    "latitude": 18.492471,
    "longitude": 73.866599,
    "totalBeds": 307,
    "erBeds": 15,
    "phone": "+91 20 7239505",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bharatratna Dr. Babasaheb Ambedkar Dawakhana",
    "city": "pune",
    "latitude": 18.496225,
    "longitude": 73.870225,
    "totalBeds": 355,
    "erBeds": 38,
    "phone": "+91 20 1646670",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Yugpurush Raja Shiv Chatrapati Bibvewadi (Appar) Pune manapa",
    "city": "pune",
    "latitude": 18.461404,
    "longitude": 73.868892,
    "totalBeds": 161,
    "erBeds": 32,
    "phone": "+91 20 5524640",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Rajeshree Shahu Maharaj Dawakhana",
    "city": "pune",
    "latitude": 18.527713,
    "longitude": 73.907674,
    "totalBeds": 516,
    "erBeds": 51,
    "phone": "+91 20 7375395",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Bapusaheb Genuji Kawade Patil Dawakhana",
    "city": "pune",
    "latitude": 18.537819,
    "longitude": 73.898493,
    "totalBeds": 201,
    "erBeds": 39,
    "phone": "+91 20 9572929",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Naidu Hospital",
    "city": "pune",
    "latitude": 18.53139,
    "longitude": 73.869151,
    "totalBeds": 141,
    "erBeds": 41,
    "phone": "+91 20 6728858",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Damodar Ravji Galande Patil Dawakhana",
    "city": "pune",
    "latitude": 18.551841,
    "longitude": 73.896929,
    "totalBeds": 322,
    "erBeds": 46,
    "phone": "+91 20 2915952",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Khrist. Rok Edward Poul Dawakhana",
    "city": "pune",
    "latitude": 18.577003,
    "longitude": 73.899032,
    "totalBeds": 543,
    "erBeds": 42,
    "phone": "+91 20 2621908",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Lokshahir Annabhau Sathe Dawakhana",
    "city": "pune",
    "latitude": 18.549598,
    "longitude": 73.890645,
    "totalBeds": 361,
    "erBeds": 11,
    "phone": "+91 20 1412706",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bharat Ratna Late. Rajiv Gandhi Maternity Home",
    "city": "pune",
    "latitude": 18.545626,
    "longitude": 73.883893,
    "totalBeds": 482,
    "erBeds": 34,
    "phone": "+91 20 9144594",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Genba Tukaram Mhaske Dawakhana",
    "city": "pune",
    "latitude": 18.578015,
    "longitude": 73.874962,
    "totalBeds": 133,
    "erBeds": 51,
    "phone": "+91 20 2781338",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Siddharth Dawakhana, Vishrantwadi",
    "city": "pune",
    "latitude": 18.572164,
    "longitude": 73.878738,
    "totalBeds": 363,
    "erBeds": 20,
    "phone": "+91 20 7586431",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Annasaheb Magar Maternity Home",
    "city": "pune",
    "latitude": 18.503093,
    "longitude": 73.92653,
    "totalBeds": 349,
    "erBeds": 24,
    "phone": "+91 20 8524544",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Sakharam Kundlik Kodre Maternity Home",
    "city": "pune",
    "latitude": 18.53391,
    "longitude": 73.927257,
    "totalBeds": 368,
    "erBeds": 54,
    "phone": "+91 20 6869169",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Namdevrao Shivarkar Maternity Home",
    "city": "pune",
    "latitude": 18.497237,
    "longitude": 73.89985,
    "totalBeds": 543,
    "erBeds": 11,
    "phone": "+91 20 3957329",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Minatai Thakare Maternity Home",
    "city": "pune",
    "latitude": 18.475892,
    "longitude": 73.889505,
    "totalBeds": 576,
    "erBeds": 59,
    "phone": "+91 20 9749992",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "PMC Dawakhana, Pune",
    "city": "pune",
    "latitude": 18.485521,
    "longitude": 73.899035,
    "totalBeds": 400,
    "erBeds": 17,
    "phone": "+91 20 3888849",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Shivshankar Pote Dawakhana",
    "city": "pune",
    "latitude": 18.4765,
    "longitude": 73.856033,
    "totalBeds": 256,
    "erBeds": 24,
    "phone": "+91 20 6374130",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Matoshri Ramabai Ambedkar Maternity Home",
    "city": "pune",
    "latitude": 18.50291,
    "longitude": 73.850023,
    "totalBeds": 280,
    "erBeds": 36,
    "phone": "+91 20 4022953",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Rajamata Jijau Maternity Home",
    "city": "pune",
    "latitude": 18.4972131,
    "longitude": 73.8550317,
    "totalBeds": 442,
    "erBeds": 21,
    "phone": "+91 20 2963921",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Janta Vasahat Dawakhana",
    "city": "pune",
    "latitude": 18.5041367,
    "longitude": 73.85130454,
    "totalBeds": 595,
    "erBeds": 14,
    "phone": "+91 20 1599247",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Kamala Nehru Hospital (General Hospital)",
    "city": "pune",
    "latitude": 18.52283,
    "longitude": 73.86199,
    "totalBeds": 269,
    "erBeds": 49,
    "phone": "+91 20 1599348",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Anandibai Narhar Gadgil Dawakhana",
    "city": "pune",
    "latitude": 18.502322,
    "longitude": 73.838387,
    "totalBeds": 205,
    "erBeds": 38,
    "phone": "+91 20 1310677",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Hindu Ruday Samrat, Shivsena Pramukh, Balasheb Thakre Dawakhana",
    "city": "pune",
    "latitude": 18.497456,
    "longitude": 73.853928,
    "totalBeds": 357,
    "erBeds": 20,
    "phone": "+91 20 9918126",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Dadasaheb Gaikwad Dawakhana",
    "city": "pune",
    "latitude": 18.524737,
    "longitude": 73.865131,
    "totalBeds": 196,
    "erBeds": 53,
    "phone": "+91 20 7611651",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Kalavatibai Mavale Dawakhana",
    "city": "pune",
    "latitude": 18.514826,
    "longitude": 73.84675,
    "totalBeds": 354,
    "erBeds": 59,
    "phone": "+91 20 7087144",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Mukundrao Lele Dawakhana",
    "city": "pune",
    "latitude": 18.519752,
    "longitude": 73.854411,
    "totalBeds": 584,
    "erBeds": 51,
    "phone": "+91 20 2382963",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bai Bhikayji Pestanji Bammanji Dawakhana",
    "city": "pune",
    "latitude": 18.511186,
    "longitude": 73.870064,
    "totalBeds": 384,
    "erBeds": 35,
    "phone": "+91 20 6202753",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Chandu Mama Sonawane Maternity Home",
    "city": "pune",
    "latitude": 18.505713,
    "longitude": 73.868817,
    "totalBeds": 264,
    "erBeds": 12,
    "phone": "+91 20 4571435",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Savitribai Phule Maternity Home",
    "city": "pune",
    "latitude": 18.504876,
    "longitude": 73.86102,
    "totalBeds": 217,
    "erBeds": 19,
    "phone": "+91 20 8475290",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late.Malti Kachi Maternity Home",
    "city": "pune",
    "latitude": 18.5121324,
    "longitude": 73.85800581,
    "totalBeds": 467,
    "erBeds": 41,
    "phone": "+91 20 2758318",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Rohidas Kirad Dawakhana",
    "city": "pune",
    "latitude": 18.511242,
    "longitude": 73.868669,
    "totalBeds": 287,
    "erBeds": 47,
    "phone": "+91 20 5042786",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Kotnis Aarogya Kendra",
    "city": "pune",
    "latitude": 18.511875,
    "longitude": 73.857932,
    "totalBeds": 418,
    "erBeds": 27,
    "phone": "+91 20 5903387",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Balaji Rakhmaji Gaikwad Dawakhana",
    "city": "pune",
    "latitude": 18.509032,
    "longitude": 73.86526,
    "totalBeds": 261,
    "erBeds": 59,
    "phone": "+91 20 7814345",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Mamasaheb Badade Dawakhana",
    "city": "pune",
    "latitude": 18.515515,
    "longitude": 73.867725,
    "totalBeds": 406,
    "erBeds": 49,
    "phone": "+91 20 4361655",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Hutatma Babu Genu Dawakhana",
    "city": "pune",
    "latitude": 18.515805,
    "longitude": 73.859786,
    "totalBeds": 530,
    "erBeds": 26,
    "phone": "+91 20 6878184",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Dalvi Maternity Hospital",
    "city": "pune",
    "latitude": 18.533046,
    "longitude": 73.84891,
    "totalBeds": 106,
    "erBeds": 58,
    "phone": "+91 20 8829842",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Dr. Homi J. Bhabha Maternity Home",
    "city": "pune",
    "latitude": 18.529152,
    "longitude": 73.833361,
    "totalBeds": 135,
    "erBeds": 54,
    "phone": "+91 20 8414847",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Jangalrao Kondiba Amrale Dawakhana",
    "city": "pune",
    "latitude": 18.522728,
    "longitude": 73.852555,
    "totalBeds": 495,
    "erBeds": 16,
    "phone": "+91 20 4932743",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Bindu Madhav Thakare Dawakhana",
    "city": "pune",
    "latitude": 18.496497,
    "longitude": 73.816307,
    "totalBeds": 351,
    "erBeds": 28,
    "phone": "+91 20 6288473",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Arvind Ganpat Bartakke Dawakhana",
    "city": "pune",
    "latitude": 18.488853,
    "longitude": 73.795542,
    "totalBeds": 273,
    "erBeds": 50,
    "phone": "+91 20 1000688",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Prathak Barate Dawakhana, Warje Malwadi",
    "city": "pune",
    "latitude": 18.4835225,
    "longitude": 73.79259612,
    "totalBeds": 268,
    "erBeds": 44,
    "phone": "+91 20 4187082",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Tharkude Dawakhana, Erandwana",
    "city": "pune",
    "latitude": 18.5066,
    "longitude": 73.832811,
    "totalBeds": 307,
    "erBeds": 58,
    "phone": "+91 20 1555816",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  },
  {
    "name": "Late. Vijayabai Shirke Aarogya Kendra",
    "city": "pune",
    "latitude": 18.487103,
    "longitude": 73.815248,
    "totalBeds": 586,
    "erBeds": 40,
    "phone": "+91 20 4774584",
    "website": "https://pune.gov.in",
    "specialties": [
      "general",
      "emergency"
    ]
  }
];

async function seed() {
  if (!uri) {
    console.error('MONGODB_URI not set. Pass it as an environment variable.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('clearpath');

    const hospitalsWithCapabilities = hospitals.map((hospital: any) => {
      const specialties = Array.isArray(hospital.specialties) ? hospital.specialties : [];
      const name = String(hospital.name || '').toLowerCase();
      const erBeds = Number(hospital.erBeds || 0);
      const totalBeds = Number(hospital.totalBeds || 0);

      const isLevel1TraumaCenter =
        specialties.includes('trauma') ||
        name.includes('trauma center') ||
        (erBeds >= 30 && totalBeds >= 250);

      return {
        ...hospital,
        isLevel1TraumaCenter,
      };
    });

    await db.collection('hospitals').deleteMany({});
    const result = await db.collection('hospitals').insertMany(hospitalsWithCapabilities);
    console.log(`Inserted ${result.insertedCount} hospitals`);

    const count = await db.collection('hospitals').countDocuments();
    if (count > 0) {
      console.log('Seed completed successfully');
    } else {
      console.error('Seed failed — no documents found');
      process.exit(1);
    }
  } finally {
    await client.close();
  }
}

seed().catch(console.error);
