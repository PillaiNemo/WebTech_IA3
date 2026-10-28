// LocationPicker: State -> District -> City/Area dropdowns (from
// data/locations.json), "Use my current location" (the browser's
// geolocation API), a landmark field and a live map preview.

import { useMemo, useState } from 'react';
import locations from '../data/locations.json';
import Icon from './Icon.jsx';
import MapEmbed from './MapEmbed.jsx';
import { haversineKm } from '../utils/geo.js';

// Finds the listed area nearest to a GPS point, so the dropdowns can follow it.
function nearestArea(lat, lng) {
  let best = null;
  locations.states.forEach((s) => s.districts.forEach((d) => d.cities.forEach((c) => {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (!best || km < best.km) best = { state: s.name, district: d.name, city: c.name, km };
  })));
  return best;
}

export default function LocationPicker({ value, onChange, errors = {} }) {
  const [gpsStatus, setGpsStatus] = useState('');

  const state = locations.states.find((s) => s.name === value.state);
  const district = state && state.districts.find((d) => d.name === value.district);
  const city = district && district.cities.find((c) => c.name === value.city);

  // Map point: the exact GPS fix if we have one, otherwise the area centre.
  const point = useMemo(() => {
    if (Number.isFinite(value.lat) && Number.isFinite(value.lng)) return { lat: value.lat, lng: value.lng };
    return city ? { lat: city.lat, lng: city.lng } : { lat: NaN, lng: NaN };
  }, [value.lat, value.lng, city]);

  const set = (patch) => onChange({ ...value, ...patch });

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGpsStatus('Your browser cannot share its location. Please pick the area from the lists.');
      return;
    }
    setGpsStatus('Finding you...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const area = nearestArea(lat, lng);
        if (area && area.km < 25) {
          onChange({ ...value, state: area.state, district: area.district, city: area.city, lat, lng });
          setGpsStatus(`Location found near ${area.city}, ${area.district}.`);
        } else {
          onChange({ ...value, lat, lng });
          setGpsStatus('Location found. Please also choose the nearest listed area below.');
        }
      },
      () => setGpsStatus('Location access was blocked. Please pick the area from the lists.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <button type="button" className="btn btn-ghost w-100 mb-1" onClick={useMyLocation}>
          <Icon name="gps" size={16} /> Use my current location
        </button>
        <p className="cf-small cf-muted mb-3" aria-live="polite">{gpsStatus}</p>

        <div className="mb-3">
          <label className="form-label" htmlFor="loc-state">State *</label>
          <select id="loc-state" className={`form-select${errors.location && !value.state ? ' is-invalid' : ''}`} value={value.state}
            onChange={(e) => set({ state: e.target.value, district: '', city: '', lat: undefined, lng: undefined })}>
            <option value="">Choose a state</option>
            {locations.states.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="loc-district">District *</label>
          <select id="loc-district" className={`form-select${errors.location && !value.district ? ' is-invalid' : ''}`} value={value.district} disabled={!state}
            onChange={(e) => set({ district: e.target.value, city: '', lat: undefined, lng: undefined })}>
            <option value="">{state ? 'Choose a district' : 'Choose a state first'}</option>
            {state && state.districts.map((d) => <option key={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="loc-city">City / Area *</label>
          <select id="loc-city" className={`form-select${errors.location && !value.city ? ' is-invalid' : ''}`} value={value.city} disabled={!district}
            onChange={(e) => set({ city: e.target.value, lat: undefined, lng: undefined })}>
            <option value="">{district ? 'Choose an area' : 'Choose a district first'}</option>
            {district && district.cities.map((c) => <option key={c.name}>{c.name}</option>)}
          </select>
          {errors.location && <div className="invalid-feedback d-block">{errors.location}</div>}
        </div>
        <div>
          <label className="form-label" htmlFor="loc-landmark">Landmark (optional)</label>
          <input id="loc-landmark" className="form-control" value={value.landmark} maxLength={120}
            placeholder="Near Green Park Bus Stop" onChange={(e) => set({ landmark: e.target.value })} />
        </div>
      </div>
      <div className="col-lg-6">
        <MapEmbed lat={point.lat} lng={point.lng} height={340} title="Map preview of the chosen location" />
      </div>
    </div>
  );
}
