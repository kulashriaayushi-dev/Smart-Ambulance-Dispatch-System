import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Dummy drivers
const baseDrivers = [
  { id: 1, offset: [0.01, 0.01], driver: "Raj", rating: 4.7 },
  { id: 2, offset: [-0.01, 0.008], driver: "Amit", rating: 4.5 },
  { id: 3, offset: [0.008, -0.01], driver: "Suresh", rating: 4.8 },
];

export default function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [driversList, setDriversList] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [ambulancePos, setAmbulancePos] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // 📍 Get real location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([
          pos.coords.latitude,
          pos.coords.longitude,
        ]);
      },
      () => {
        alert("Please allow location access");
      }
    );
  }, []);

  // 🚨 Get route from OSRM
  const getRoute = async (start, end) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();
    const route = data.routes[0];

    return {
      path: route.geometry.coordinates.map((c) => [c[1], c[0]]),
      duration: route.duration,
    };
  };

  // 🚑 Animate movement
  const moveAlongRoute = (route) => {
    let i = 0;

    const interval = setInterval(() => {
      if (i >= route.length) {
        clearInterval(interval);
        setStatus("Arrived 🚑");
        return;
      }

      setAmbulancePos(route[i]);
      i++;
    }, 200);
  };

  // 📍 Generate nearby drivers
  const generateDrivers = () => {
    return baseDrivers.map((d) => ({
      ...d,
      position: [
        userLocation[0] + d.offset[0],
        userLocation[1] + d.offset[1],
      ],
    }));
  };

  // 🚀 Request ambulances
  const requestAmbulance = async () => {
    if (!userLocation) return;

    setLoading(true);
    setStatus("Finding nearby ambulances...");

    const drivers = generateDrivers();
    const list = [];

    for (let d of drivers) {
      const result = await getRoute(d.position, userLocation);

      list.push({
        ...d,
        eta: Math.ceil(result.duration / 60),
        route: result.path,
      });
    }

    list.sort((a, b) => a.eta - b.eta);

    setDriversList(list);
    setLoading(false);
    setStatus("Select an ambulance");
  };

  // ✅ Select driver
  const selectDriver = (driver) => {
    setSelectedDriver(driver);
    setRoutePath(driver.route);
    setAmbulancePos(driver.position);
    setStatus(`${driver.driver} is on the way 🚑`);

    moveAlongRoute(driver.route);
  };

  // ⏳ Wait for location
  if (!userLocation) {
    return <h2 style={{ padding: 20 }}>Getting your location...</h2>;
  }

 return (
  <div className="app-container">
    
    {/* MAP CARD */}
    <div className="map-wrapper">
      <MapContainer
        center={userLocation}
        zoom={14}
        className="map"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={userLocation}>
          <Popup>You are here</Popup>
        </Marker>

        {driversList.map((d) => (
          <Marker key={d.id} position={d.position}>
            <Popup>🚑 {d.driver}</Popup>
          </Marker>
        ))}

        {ambulancePos && (
          <Marker position={ambulancePos}>
            <Popup>🚑 On the way</Popup>
          </Marker>
        )}

        {routePath.length > 0 && (
          <Polyline positions={routePath} color="blue" />
        )}
      </MapContainer>
    </div>

    {/* BOTTOM UI */}
    <div className="bottom-sheet">
      
      <div className="handle" />

      <div className="status-text">{status}</div>

      {!driversList.length && (
        <button className="primary-btn" onClick={requestAmbulance}>
          {loading ? "Finding ambulances..." : "Request Ambulance"}
        </button>
      )}

      {driversList.length > 0 && !selectedDriver && (
        <>
          <h3>Select Ambulance</h3>

          {driversList.map((d) => (
            <div
              key={d.id}
              className="driver-card"
              onClick={() => selectDriver(d)}
            >
              <div>
                <strong>🚑 {d.driver}</strong><br />
                ⭐ {d.rating}
              </div>
              <div>⏱ {d.eta} min</div>
            </div>
          ))}
        </>
      )}

      {selectedDriver && (
        <>
          <h3>🚑 On the way</h3>

          <div className="driver-card">
            <div>
              <strong>{selectedDriver.driver}</strong><br />
              ⭐ {selectedDriver.rating}
            </div>
            <div>⏱ {selectedDriver.eta} min</div>
          </div>

          <button
            className="primary-btn"
            onClick={() => window.location.reload()}
          >
            Cancel Request
          </button>
        </>
      )}
    </div>
  </div>
);
}