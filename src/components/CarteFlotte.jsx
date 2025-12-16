import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "../config/supabaseClient";

// 🚛 Icône camion
const camionIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/744/744465.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

export default function CarteFlotte() {
  const [missions, setMissions] = useState([]);
  const [positions, setPositions] = useState([]);

  const center = [12.3711, -1.5197]; // Ouagadougou

  /* =============================
     1️⃣ Charger missions actives
     ============================= */
  useEffect(() => {
    const fetchMissions = async () => {
      const { data, error } = await supabase
        .from("missions_gts")
        .select(`
          id,
          titre,
          camion:camions(id, immatriculation),
          chauffeur_id
        `)
        .eq("statut", "En cours");

      if (!error) setMissions(data || []);
    };

    fetchMissions();
  }, []);

  /* =============================
     2️⃣ Charger dernières positions
     ============================= */
  useEffect(() => {
    const fetchPositions = async () => {
      const { data } = await supabase
        .from("mission_positions")
        .select("*")
        .order("created_at", { ascending: true });

      setPositions(data || []);
    };

    fetchPositions();

    /* 🔴 TEMPS RÉEL */
    const channel = supabase
      .channel("gps-tracking")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mission_positions",
        },
        payload => {
          setPositions(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /* =============================
     3️⃣ Positions par mission
     ============================= */
  const positionsByMission = useMemo(() => {
    const map = {};
    positions.forEach(p => {
      if (!map[p.mission_id]) map[p.mission_id] = [];
      map[p.mission_id].push(p);
    });
    return map;
  }, [positions]);

  return (
    <div className="h-[600px] rounded-xl overflow-hidden border">
      <MapContainer center={center} zoom={6} className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />

        {missions.map(mission => {
          const trajets = positionsByMission[mission.id] || [];
          if (trajets.length === 0) return null;

          const last = trajets[trajets.length - 1];

          return (
            <React.Fragment key={mission.id}>
              {/* Trajet */}
              {trajets.length > 1 && (
                <Polyline
                  positions={trajets.map(p => [p.latitude, p.longitude])}
                  color="blue"
                  weight={4}
                />
              )}

              {/* Camion */}
              <Marker
                position={[last.latitude, last.longitude]}
                icon={camionIcon}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div className="text-sm">
                    <strong>🚛 Camion :</strong>{" "}
                    {mission.camion?.immatriculation}
                    <br />
                    <strong>📄 Mission :</strong> {mission.titre}
                    <br />
                    <strong>🕒 Dernière maj :</strong>{" "}
                    {new Date(last.created_at).toLocaleTimeString()}
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
