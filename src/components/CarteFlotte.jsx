import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "../config/supabaseClient.js";

// --- Icône custom pour le chauffeur ---
const chauffeurIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1995/1995574.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

// --- Composant pour recentrer la carte ---
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 13, { animate: true });
  }, [position, map]);
  return null;
}

export default function CarteFlotte() {
  const [missions, setMissions] = useState([]);
  const [positions, setPositions] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [camions, setCamions] = useState([]);
  const [filterChauffeur, setFilterChauffeur] = useState("");
  const [filterCamion, setFilterCamion] = useState("");
  const [centerPosition, setCenterPosition] = useState([12.3711, -1.5197]);

  useEffect(() => {
    const fetchMissions = async () => {
      const { data, error } = await supabase
        .from("missions")
        .select(`
          *,
          user:users(id, name),
          camion:camions(id, immatriculation)
        `)
        .eq("statut", "en_cours");
      if (error) console.error(error);
      else setMissions(data || []);
    };

    const fetchPositions = async () => {
      const { data, error } = await supabase.from("positions").select("*");
      if (error) console.error(error);
      else setPositions(data || []);
    };

    const fetchChauffeurs = async () => {
      const { data, error } = await supabase.from("users").select("id, name");
      if (error) console.error(error);
      else setChauffeurs(data || []);
    };

    const fetchCamions = async () => {
      const { data, error } = await supabase.from("camions").select("id, immatriculation");
      if (error) console.error(error);
      else setCamions(data || []);
    };

    fetchMissions();
    fetchPositions();
    fetchChauffeurs();
    fetchCamions();

    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredMissions = useMemo(() => {
    return missions.filter(m => {
      const matchChauffeur = filterChauffeur ? m.chauffeur_id === filterChauffeur : true;
      const matchCamion = filterCamion ? m.camion_id === filterCamion : true;
      return matchChauffeur && matchCamion;
    });
  }, [missions, filterChauffeur, filterCamion]);

  useEffect(() => {
    if (filteredMissions.length === 1) {
      const missionPositions = positions
        .filter(p => p.chauffeur_id === filteredMissions[0].chauffeur_id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      if (missionPositions.length > 0) {
        const lastPos = missionPositions[missionPositions.length - 1];
        setCenterPosition([lastPos.latitude, lastPos.longitude]);
      }
    }
  }, [filteredMissions, positions]);

  return (
    <div className="p-4 w-full">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <select
          value={filterChauffeur}
          onChange={e => {
            setFilterChauffeur(e.target.value);
            setFilterCamion("");
          }}
          className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">Tous les chauffeurs</option>
          {chauffeurs.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filterCamion}
          onChange={e => {
            setFilterCamion(e.target.value);
            setFilterChauffeur("");
          }}
          className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">Tous les camions</option>
          {camions.map(c => (
            <option key={c.id} value={c.id}>{c.immatriculation}</option>
          ))}
        </select>
      </div>

      {/* Carte */}
      <div className="rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <MapContainer center={centerPosition} zoom={6} style={{ height: "600px", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          <RecenterMap position={centerPosition} />

          {filteredMissions.map(mission => {
            const missionPositions = positions
              .filter(p => p.chauffeur_id === mission.chauffeur_id)
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            if (missionPositions.length === 0) return null;
            const lastPos = missionPositions[missionPositions.length - 1];

            return (
              <React.Fragment key={mission.id_uuid}>
                {missionPositions.length > 1 && (
                  <Polyline
                    positions={missionPositions.map(p => [p.latitude, p.longitude])}
                    color="blue"
                    weight={4}
                  />
                )}
                <Marker
                  position={[lastPos.latitude, lastPos.longitude]}
                  icon={chauffeurIcon}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                    <div>
                      <strong>Chauffeur:</strong> {mission.user?.name} <br />
                      <strong>Camion:</strong> {mission.camion?.immatriculation} <br />
                      <strong>Mission:</strong> {mission.titre} <br />
                      <strong>Destination:</strong> {mission.destination}
                    </div>
                  </Tooltip>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
