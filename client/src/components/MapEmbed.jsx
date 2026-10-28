// MapEmbed: an OpenStreetMap <iframe> centred on a point, with a marker.
// No map library: OpenStreetMap's own embed page draws the map.

export function osmLink(lat, lng) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

export default function MapEmbed({ lat, lng, title = 'Map of the issue location', zoom = 0.004, height = 260 }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div className="cf-map cf-map--empty" style={{ height }}>
        <span>Choose a place to see it on the map.</span>
      </div>
    );
  }
  const bbox = [lng - zoom, lat - zoom * 0.6, lng + zoom, lat + zoom * 0.6].map((n) => n.toFixed(5)).join(',');
  return (
    <iframe
      className="cf-map"
      title={title}
      style={{ height }}
      loading="lazy"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
    />
  );
}
