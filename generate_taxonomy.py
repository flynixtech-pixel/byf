import json
import re

json_data = {
  "sports": [
    {"id": "cricket", "name": "Cricket", "venueType": "Turf"},
    {"id": "box-cricket", "name": "Box Cricket", "venueType": "Turf"},
    {"id": "tennis-ball-cricket", "name": "Tennis Ball Cricket", "venueType": "Turf"},
    {"id": "football", "name": "Football", "venueType": "Ground"},
    {"id": "futsal", "name": "Futsal", "venueType": "Court"},
    {"id": "badminton", "name": "Badminton", "venueType": "Court"},
    {"id": "tennis", "name": "Tennis", "venueType": "Court"},
    {"id": "soft-tennis", "name": "Soft Tennis", "venueType": "Court"},
    {"id": "pickleball", "name": "Pickleball", "venueType": "Court"},
    {"id": "padel", "name": "Padel", "venueType": "Court"},
    {"id": "squash", "name": "Squash", "venueType": "Court"},
    {"id": "racquetball", "name": "Racquetball", "venueType": "Court"},
    {"id": "basketball", "name": "Basketball", "venueType": "Court"},
    {"id": "3x3-basketball", "name": "3x3 Basketball", "venueType": "Court"},
    {"id": "volleyball", "name": "Volleyball", "venueType": "Court"},
    {"id": "beach-volleyball", "name": "Beach Volleyball", "venueType": "Court"},
    {"id": "handball", "name": "Handball", "venueType": "Court"},
    {"id": "kabaddi", "name": "Kabaddi", "venueType": "Ground"},
    {"id": "beach-kabaddi", "name": "Beach Kabaddi", "venueType": "Ground"},
    {"id": "circle-kabaddi", "name": "Circle Kabaddi", "venueType": "Ground"},
    {"id": "kho-kho", "name": "Kho-Kho", "venueType": "Ground"},
    {"id": "hockey", "name": "Hockey", "venueType": "Ground"},
    {"id": "field-hockey", "name": "Field Hockey", "venueType": "Ground"},
    {"id": "rugby", "name": "Rugby", "venueType": "Ground"},
    {"id": "american-football", "name": "American Football", "venueType": "Ground"},
    {"id": "baseball", "name": "Baseball", "venueType": "Ground"},
    {"id": "softball", "name": "Softball", "venueType": "Ground"},
    {"id": "athletics", "name": "Athletics", "venueType": "Track"},
    {"id": "cycling", "name": "Cycling", "venueType": "Track"},
    {"id": "track-cycling", "name": "Track Cycling", "venueType": "Velodrome"},
    {"id": "skating", "name": "Skating", "venueType": "Rink"},
    {"id": "roller-skating", "name": "Roller Skating", "venueType": "Rink"},
    {"id": "ice-skating", "name": "Ice Skating", "venueType": "Rink"},
    {"id": "ice-hockey", "name": "Ice Hockey", "venueType": "Rink"},
    {"id": "swimming", "name": "Swimming", "venueType": "Pool"},
    {"id": "water-polo", "name": "Water Polo", "venueType": "Pool"},
    {"id": "diving", "name": "Diving", "venueType": "Pool"},
    {"id": "artistic-swimming", "name": "Artistic Swimming", "venueType": "Pool"},
    {"id": "table-tennis", "name": "Table Tennis", "venueType": "Table"},
    {"id": "billiards", "name": "Billiards", "venueType": "Table"},
    {"id": "snooker", "name": "Snooker", "venueType": "Table"},
    {"id": "pool", "name": "Pool", "venueType": "Table"},
    {"id": "carrom", "name": "Carrom", "venueType": "Board"},
    {"id": "chess", "name": "Chess", "venueType": "Table"},
    {"id": "archery", "name": "Archery", "venueType": "Range"},
    {"id": "shooting", "name": "Shooting", "venueType": "Range"},
    {"id": "boxing", "name": "Boxing", "venueType": "Ring"},
    {"id": "kickboxing", "name": "Kickboxing", "venueType": "Ring"},
    {"id": "wrestling", "name": "Wrestling", "venueType": "Arena"},
    {"id": "judo", "name": "Judo", "venueType": "Dojo"},
    {"id": "karate", "name": "Karate", "venueType": "Dojo"},
    {"id": "taekwondo", "name": "Taekwondo", "venueType": "Dojo"},
    {"id": "wushu", "name": "Wushu", "venueType": "Arena"},
    {"id": "fencing", "name": "Fencing", "venueType": "Piste"},
    {"id": "gymnastics", "name": "Gymnastics", "venueType": "Arena"},
    {"id": "yoga", "name": "Yoga", "venueType": "Studio"},
    {"id": "yogasana", "name": "Yogasana", "venueType": "Studio"},
    {"id": "pilates", "name": "Pilates", "venueType": "Studio"},
    {"id": "dance", "name": "Dance", "venueType": "Studio"},
    {"id": "fitness", "name": "Fitness", "venueType": "Gym"},
    {"id": "gym", "name": "Gym", "venueType": "Gym"},
    {"id": "golf", "name": "Golf", "venueType": "Course"},
    {"id": "mini-golf", "name": "Mini Golf", "venueType": "Course"},
    {"id": "polo", "name": "Polo", "venueType": "Ground"},
    {"id": "equestrian", "name": "Equestrian", "venueType": "Arena"},
    {"id": "horse-riding", "name": "Horse Riding", "venueType": "Arena"},
    {"id": "rowing", "name": "Rowing", "venueType": "Water Course"},
    {"id": "kayaking", "name": "Kayaking", "venueType": "Water Course"},
    {"id": "canoeing", "name": "Canoeing", "venueType": "Water Course"},
    {"id": "surfing", "name": "Surfing", "venueType": "Beach"},
    {"id": "sailing", "name": "Sailing", "venueType": "Water Course"},
    {"id": "yachting", "name": "Yachting", "venueType": "Marina"},
    {"id": "triathlon", "name": "Triathlon", "venueType": "Course"},
    {"id": "modern-pentathlon", "name": "Modern Pentathlon", "venueType": "Arena"},
    {"id": "sepaktakraw", "name": "Sepak Takraw", "venueType": "Court"},
    {"id": "netball", "name": "Netball", "venueType": "Court"},
    {"id": "korfball", "name": "Korfball", "venueType": "Court"},
    {"id": "throwball", "name": "Throwball", "venueType": "Court"},
    {"id": "roll-ball", "name": "Roll Ball", "venueType": "Court"},
    {"id": "shooting-ball", "name": "Shooting Ball", "venueType": "Court"},
    {"id": "atya-patya", "name": "Atya Patya", "venueType": "Ground"},
    {"id": "mallakhamb", "name": "Mallakhamb", "venueType": "Arena"},
    {"id": "powerlifting", "name": "Powerlifting", "venueType": "Gym"},
    {"id": "weightlifting", "name": "Weightlifting", "venueType": "Gym"},
    {"id": "bodybuilding", "name": "Bodybuilding", "venueType": "Gym"},
    {"id": "tug-of-war", "name": "Tug of War", "venueType": "Ground"},
    {"id": "bridge", "name": "Bridge", "venueType": "Table"},
    {"id": "bowling", "name": "Bowling", "venueType": "Lane"},
    {"id": "ten-pin-bowling", "name": "Ten-Pin Bowling", "venueType": "Lane"},
    {"id": "darts", "name": "Darts", "venueType": "Board"},
    {"id": "air-hockey", "name": "Air Hockey", "venueType": "Table"},
    {"id": "foosball", "name": "Foosball", "venueType": "Table"},
    {"id": "paintball", "name": "Paintball", "venueType": "Arena"},
    {"id": "laser-tag", "name": "Laser Tag", "venueType": "Arena"},
    {"id": "climbing", "name": "Climbing", "venueType": "Climbing Wall"},
    {"id": "bouldering", "name": "Bouldering", "venueType": "Climbing Wall"},
    {"id": "martial-arts", "name": "Martial Arts", "venueType": "Dojo"},
    {"id": "aikido", "name": "Aikido", "venueType": "Dojo"},
    {"id": "jiu-jitsu", "name": "Jiu-Jitsu", "venueType": "Dojo"},
    {"id": "muay-thai", "name": "Muay Thai", "venueType": "Ring"},
    {"id": "mma", "name": "MMA", "venueType": "Arena"},
    {"id": "wushu-sanda", "name": "Wushu Sanda", "venueType": "Ring"},
    {"id": "flying-disc", "name": "Flying Disc", "venueType": "Ground"},
    {"id": "ultimate-frisbee", "name": "Ultimate Frisbee", "venueType": "Ground"},
    {"id": "base-jumping", "name": "Base Jumping", "venueType": "Outdoor Site"},
    {"id": "skateboarding", "name": "Skateboarding", "venueType": "Skate Park"},
    {"id": "bmx", "name": "BMX", "venueType": "Track"},
    {"id": "motorsport", "name": "Motorsport", "venueType": "Circuit"},
    {"id": "karting", "name": "Karting", "venueType": "Circuit"},
    {"id": "drag-racing", "name": "Drag Racing", "venueType": "Track"},
    {"id": "air-sports", "name": "Air Sports", "venueType": "Airfield"},
    {"id": "paragliding", "name": "Paragliding", "venueType": "Launch Site"},
    {"id": "hang-gliding", "name": "Hang Gliding", "venueType": "Launch Site"},
    {"id": "triathlon-swimming", "name": "Triathlon Swimming", "venueType": "Pool"}
  ]
}

existing_images = {
  "cricket": "/bat.png",
  "football": "/football.png",
  "badminton": "/badminton.png",
  "pickleball": "/pickball.png",
  "tennis": "/tennis.png",
  "table-tennis": "/tabletennis.png",
  "basketball": "/basketball.jpg",
  "volleyball": "/volleyball.jpg",
  "swimming": "/swimming.jpg",
  "skating": "/skating.jpg",
}

out = "export const SPORT_CATEGORIES: SportCategory[] = [\n"
for s in json_data["sports"]:
    image = existing_images.get(s["id"], "")
    image_str = f'    image: "{image}",\n' if image else ""
    out += f'  {{\n'
    out += f'    id: "{s["id"]}",\n'
    out += f'    label: "{s["name"]}",\n'
    if image: out += image_str
    out += f'    venueType: "{s["venueType"]}",\n'
    out += f'    venue: "both",\n'
    out += f'    subCategories: [],\n'
    out += f'  }},\n'
out += "];\n"

with open("lib/taxonomy.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("venue: VenueSetting;", "venue: VenueSetting;\n  venueType?: string;")

start_idx = content.find("export const SPORT_CATEGORIES: SportCategory[] = [")
# find the next ];
end_idx = content.find("];\n", start_idx) + 3

new_content = content[:start_idx] + out + content[end_idx:]

with open("lib/taxonomy.ts", "w", encoding="utf-8", newline='\n') as f:
    f.write(new_content)
print("Updated lib/taxonomy.ts successfully")
