#!/usr/bin/env python3
"""Comprehensive Apple Music track fixer."""
import json, time, urllib.request, urllib.parse, socket, sys

socket.setdefaulttimeout(15)
CATALOG_PATH = "src/data/catalog.generated.json"
DELAY = 1.0

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "AlbumVault/0.1"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def lookup_tracks(cid):
    for c in ["US","GB","JP","DE","NL","FR","AU","NZ"]:
        try:
            data = fetch(f"https://itunes.apple.com/lookup?id={cid}&entity=song&country={c}")
            tracks = []
            for r in data.get("results", []):
                if r.get("wrapperType") == "track" and r.get("kind") == "song":
                    tracks.append({
                        "discNumber": r.get("discNumber", 1),
                        "trackNumber": r.get("trackNumber", 0),
                        "title": r.get("trackName", ""),
                        "durationMs": r.get("trackTimeMillis"),
                        "previewUrl": r.get("previewUrl")
                    })
            if tracks:
                tracks.sort(key=lambda t: (t["discNumber"], t["trackNumber"]))
                return tracks, c
        except:
            pass
        time.sleep(0.25)
    return [], None

def find_via_track(artist, track_name):
    term = urllib.parse.quote(f"{track_name} {artist}")
    art_low = artist.lower()
    for country in ["US","GB","JP","DE"]:
        try:
            data = fetch(f"https://itunes.apple.com/search?term={term}&media=music&entity=song&limit=10&country={country}")
            for r in data.get("results", []):
                if r.get("kind") != "song": continue
                aname = r.get("artistName","").lower()
                if art_low not in aname: continue
                cname = r.get("collectionName","").lower()
                if any(x in cname for x in ["single","ep","remix","compilation","greatest","tribute",": solo "]):
                    continue
                return r.get("collectionId"), r.get("collectionName"), country
        except: pass
        time.sleep(DELAY/3)
    return None,None,None

def find_album(artist, title):
    term = urllib.parse.quote(f"{artist} {title}")
    art_low = artist.lower()
    tit_low = title.lower()
    for country in ["US","GB","JP","DE","NL","FR","AU"]:
        try:
            data = fetch(f"https://itunes.apple.com/search?term={term}&media=music&entity=album&limit=15&country={country}")
            for r in data.get("results", []):
                if r.get("wrapperType") != "collection": continue
                aname = r.get("artistName","").lower()
                if art_low not in aname: continue
                cname = r.get("collectionName","").lower()
                if any(x in cname for x in ["single","ep","remix","karaoke","deluxe","expanded","anniversary","tribute","lullaby",": solo","piano tribute"]):
                    continue
                if tit_low == cname or (len(tit_low)>8 and tit_low in cname):
                    return r, country
        except: pass
        time.sleep(DELAY/3)
    return None,None

TRACK_HINTS = {
    "Nevermind":"Smells Like Teen Spirit","Exile on Main St.":"Tumbling Dice",
    "It Takes a Nation of Millions to Hold Us Back":"Bring the Noise",
    "Lemonade":"Formation","The Chronic":"Nuthin' But a G Thang","Blonde":"Nikes",
    "Exile in Guyville":"Fuck and Run","Appetite for Destruction":"Sweet Child O' Mine",
    "Reasonable Doubt":"Can't Knock the Hustle","Plastic Ono Band":"Mother",
    "Automatic for the People":"Everybody Hurts","Live Through This":"Doll Parts",
    "When the Pawn...":"Paper Bag","Disintegration":"Pictures of You",
    "The Downward Spiral":"Closer","Paul's Boutique":"Shake Your Rump",
    "1999":"Little Red Corvette","Maggot Brain":"Maggot Brain",
    "The Marshall Mathers LP":"The Real Slim Shady","Parallel Lines":"Heart of Glass",
    "Channel Orange":"Thinkin Bout You","A Love Supreme":"Acknowledgement",
    "Mama's Gun":"Didn't Cha Know","Different Class":"Common People",
    "20 Golden Greats":"That'll Be the Day","Fear of a Black Planet":"Fight the Power",
    "Blood Sugar Sex Magik":"Under the Bridge","Electric Warrior":"Get It On",
    "Slanted and Enchanted":"Summer Babe","Diamond Life":"Smooth Operator",
    "Midnight Marauders":"Award Tour","Homogenic":"J\u00f3ga","Pink Moon":"Pink Moon",
    "Rage Against the Machine":"Killing in the Name","Raising Hell":"Walk This Way",
    "Yankee Hotel Foxtrot":"Jesus, Etc.","Hospice":"Kettering",
    "Mama Said Knock You Out":"Mama Said Knock You Out","American Idiot":"American Idiot",
}

HARDCODED = {
    "Trout Mask Replica": [
        "Frownland","The Dust Blows Forward 'n the Dust Blows Back","Dachau Blues",
        "Ella Guru","Hair Pie: Bake 1","Moonlight on Vermont","Pachuco Cadaver",
        "Bill's Corpse","Sweet Sweet Bulbs","Neon Meate Dream of a Octafish",
        "China Pig","My Human Gets Me Blues","Dali's Car","Hair Pie: Bake 2",
        "Pena","Well","When Big Joan Sets Up","Fallin' Ditch","Sugar 'n Spikes",
        "Ant Man Bee","Orange Claw Hammer","Wild Life","She's Too Much for My Mirror",
        "Hobo Chang Ba","The Blimp (mousetrapreplica)","Steal Softly Thru Snow",
        "Old Fart at Play","Veteran's Day Poppy",
    ],
}

def make_tracks(names):
    return [{"discNumber":1,"trackNumber":i+1,"title":n,"durationMs":None,"previewUrl":None} for i,n in enumerate(names)]

def main():
    with open(CATALOG_PATH) as f:
        catalog = json.load(f)
    empty = [a for a in catalog["albums"] if len(a.get("tracks",[])) == 0]
    if not empty:
        print("All albums have tracks!")
        return
    print(f"{len(empty)} albums with 0 tracks\n")
    fixed = 0; failed = 0; total = len(empty)
    
    for i, album in enumerate(empty):
        ttl = album["title"]; art = album["artist"]; rnk = album["rank"]; cid = album.get("appleCollectionId")
        pfx = f"[{i+1}/{total}] #{rnk} \"{ttl}\" by {art}"
        print(pfx, end=" ", flush=True)
        
        if ttl in HARDCODED:
            album["tracks"] = make_tracks(HARDCODED[ttl])
            print(f"\u2192 \u2705 {len(album['tracks'])} tracks (hardcoded)"); fixed += 1; continue
        
        if cid:
            tracks, store = lookup_tracks(cid)
            if tracks:
                album["tracks"] = tracks
                print(f"\u2192 \u2705 {len(tracks)} tracks (existing id, {store})"); fixed += 1; time.sleep(DELAY); continue
        
        hint = TRACK_HINTS.get(ttl)
        if hint:
            t_cid, t_name, t_country = find_via_track(art, hint)
            if t_cid:
                tracks, tstore = lookup_tracks(t_cid)
                if tracks:
                    album["tracks"] = tracks; album["appleCollectionId"] = t_cid
                    album["appleCollectionUrl"] = f"https://music.apple.com/album/{t_cid}"
                    print(f"\u2192 \u2705 {len(tracks)} tracks (via \"{hint}\", id={t_cid})"); fixed += 1; time.sleep(DELAY); continue
        time.sleep(DELAY)
        
        match, m_country = find_album(art, ttl)
        if match:
            m_cid = match.get("collectionId")
            if m_cid and m_cid != cid:
                tracks, mstore = lookup_tracks(m_cid)
                if tracks:
                    album["tracks"] = tracks; album["appleCollectionId"] = m_cid
                    album["appleCollectionUrl"] = match.get("collectionViewUrl")
                    aw = match.get("artworkUrl100","")
                    if aw: album["appleArtworkUrl"] = aw.replace("100x100bb","600x600bb")
                    if not album.get("genre"): album["genre"] = match.get("primaryGenreName")
                    print(f"\u2192 \u2705 {len(tracks)} tracks (direct, id={m_cid})"); fixed += 1; time.sleep(DELAY); continue
        
        print(f"\u2192 \u274c Not found"); failed += 1
    
    catalog["metadata"]["generatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(CATALOG_PATH, "w") as f:
        json.dump(catalog, f, indent=2); f.write("\n")
    
    still = [a for a in catalog["albums"] if len(a.get("tracks",[])) == 0]
    print(f"\n{'='*60}")
    print(f"Fixed: {fixed} | Failed: {failed} | Still empty: {len(still)}/{total}")
    if still:
        for a in still:
            print(f"  #{a['rank']} \"{a['title']}\" by {a['artist']}")

if __name__ == "__main__":
    main()
