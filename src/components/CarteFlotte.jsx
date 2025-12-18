// src/components/CarteFlotte.jsx
import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "../config/supabaseClient";

// ✅ Import de l'image locale pour le camion
import camionImg from "../assets/camion_benne.png";

// Icône Leaflet pour le camion
const camionIcon = new L.Icon({
  iconUrl: camionImg, // image locale
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

export default function CarteFlotte({ center = [12.3711, -1.5197] }) {
  const [missions, setMissions] = useState([]);
  const [positions, setPositions] = useState([]);

  // 1️⃣ Charger missions actives
  useEffect(() => {
    const fetchMissions = async () => {
      const { data, error } = await supabase
        .from("missions_gts")
        .select(`id, titre, camion:camions(id, immatriculation)`)
        .in("statut", ["En Cours", "En Chargement", "En Déchargement"]);

      if (error) return console.error("Erreur fetch missions:", error);
      setMissions(data || []);
    };
    fetchMissions();
  }, []);

  // 2️⃣ Charger dernières positions + realtime
  useEffect(() => {
    const fetchPositions = async () => {
      const { data, error } = await supabase
        .from("mission_positions")
        .select("*")
        .order("recorded_at", { ascending: true });

      if (error) return console.error("Erreur fetch positions:", error);
      setPositions(data || []);
    };

    fetchPositions();

    // Realtime
    const channel = supabase
      .channel("gps-tracking")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mission_positions" },
        (payload) => {
          setPositions((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // 3️⃣ Grouper positions par mission
  const positionsByMission = useMemo(() => {
    const map = {};
    positions.forEach((p) => {
      if (!p.mission_id) return;
      if (!map[p.mission_id]) map[p.mission_id] = [];
      map[p.mission_id].push(p);
    });
    return map;
  }, [positions]);

  // 4️⃣ Centre de la carte
  const mapCenter = useMemo(() => {
    for (let mission of missions) {
      const trajets = positionsByMission[mission.id] || [];
      if (trajets.length > 0) {
        const last = trajets[trajets.length - 1];
        return [parseFloat(last.latitude), parseFloat(last.longitude)];
      }
    }
    return center;
  }, [missions, positionsByMission, center]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border">
      <MapContainer center={mapCenter} zoom={6} className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />

        {missions.map((mission) => {
          const trajets = positionsByMission[mission.id] || [];
          if (trajets.length === 0) return null;

          const last = trajets[trajets.length - 1];

          return (
            <React.Fragment key={mission.id}>
              {/* Trajet */}
              {trajets.length > 1 && (
                <Polyline
                  positions={trajets.map((p) => [parseFloat(p.latitude), parseFloat(p.longitude)])}
                  color="blue"
                  weight={4}
                />
              )}

              {/* Camion */}
              <Marker
                position={[parseFloat(last.latitude), parseFloat(last.longitude)]}
                icon={camionIcon} // icône locale
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div className="text-sm">
                    <strong>🚛 Camion :</strong> {mission.camion?.immatriculation || "N/A"}
                    <br />
                    <strong>📄 Mission :</strong> {mission.titre || "N/A"}
                    <br />
                    <strong>🕒 Dernière maj :</strong>{" "}
                    {new Date(last.recorded_at).toLocaleTimeString("fr-FR")}
                  </div>
                </Tooltip>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
