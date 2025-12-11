// src/components/modals/DeclarePanneModal.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Card, CardHeader, CardContent, CardTitle } from "../ui/card.jsx";
import { Button } from "../ui/button.jsx";
import { Input } from "../ui/input.jsx";
import { Textarea } from "../ui/textarea.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.jsx";
import { Label } from "../ui/label.jsx";
import { useToast } from "../ui/use-toast.jsx";
import {
  X,
  Wrench,
  Camera,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  CarFront,
  Radio,
} from "lucide-react";

const PANNE_TYPES = [
  { value: "mécanique", label: "Mécanique", icon: Wrench },
  { value: "électrique", label: "Électrique", icon: Zap },
  { value: "crevaison", label: "Crevaison", icon: AlertCircle },
  { value: "accident", label: "Accident", icon: CarFront },
  { value: "autres", label: "Autres", icon: Radio },
];

export default function DeclarePanneModal({ open, onClose, chauffeurId, missionId }) {
  const { toast } = useToast();

  const [type, setType] = useState("mécanique");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("loading");

  // GPS
  useEffect(() => {
    if (open && navigator.geolocation) {
      setGpsStatus("loading");

      const timeout = setTimeout(() => {
        setGpsStatus("error");
        console.warn("Délai GPS écoulé.");
      }, 8000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setGpsStatus("success");
        },
        (err) => {
          clearTimeout(timeout);
          console.warn("Erreur GPS :", err.message);
          setGpsStatus("error");
          toast({
            title: "Localisation GPS",
            description:
              "Impossible d'obtenir la position actuelle. Vérifiez les permissions.",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      return () => clearTimeout(timeout);
    }
  }, [open, toast]);

  const handleClose = () => {
    setType("mécanique");
    setDescription("");
    setPhoto(null);
    setLatitude(null);
    setLongitude(null);
    setGpsStatus("loading");
    onClose();
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erreur Photo",
          description: "Le fichier est trop volumineux (max 5MB).",
          variant: "destructive",
        });
        e.target.value = null;
        setPhoto(null);
        return;
      }
      setPhoto(file);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Erreur de validation",
        description: "La description est obligatoire.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    let photoPath = null;

    if (photo) {
      const fileExt = photo.name.split(".").pop();
      const storagePath = `BATICOM/${chauffeurId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("pannes")
        .upload(storagePath, photo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        toast({
          title: "❌ Erreur Upload",
          description: uploadError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      photoPath = storagePath;
    }

    const { error } = await supabase.from("alertespannes").insert({
      chauffeur_id: chauffeurId,
      mission_id: missionId,
      structure: "BATICOM",
      typepanne: type,
      description,
      photo: photoPath,
      latitude,
      longitude,
      statut: "en_cours",
    });

    if (error) {
      toast({
        title: "❌ Erreur de Déclaration",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "✅ Panne déclarée !",
        description: "Votre alerte a été envoyée à la maintenance BATICOM.",
      });
      handleClose();
    }

    setLoading(false);
  };

  if (!open) return null;

  const GpsStatusIndicator = () => {
    switch (gpsStatus) {
      case "loading":
        return (
          <span className="flex items-center text-sm text-blue-500">
            <Loader2 className="animate-spin w-4 h-4 mr-2" />
            Localisation en cours...
          </span>
        );
      case "success":
        return (
          <span className="flex items-center text-sm text-green-600 font-medium">
            <CheckCircle className="w-4 h-4 mr-2" />
            GPS: {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
          </span>
        );
      case "error":
        return (
          <span className="flex items-center text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            Localisation échouée
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white relative shadow-2xl rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <Wrench className="w-6 h-6 text-red-600" />
            Déclarer une panne (BATICOM)
          </CardTitle>

          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <X size={20} />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">

          {/* TYPE */}
          <div className="space-y-2">
            <Label>Type de panne</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue value={type} placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                {PANNE_TYPES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <p.icon className="w-4 h-4 mr-2 inline" />
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème..."
            />
          </div>

          {/* PHOTO */}
          <div className="space-y-2">
            <Label>
              <Camera className="inline w-4 h-4 mr-2" />
              Photo (optionnel)
            </Label>
            <Input type="file" accept="image/*" onChange={handlePhotoChange} />
          </div>

          {/* GPS */}
          <div className="flex items-center justify-between border-t pt-3">
            <Label>
              <MapPin className="inline w-4 h-4 mr-2" />
              Position GPS
            </Label>
            <GpsStatusIndicator />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !description.trim()}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                Envoi...
              </span>
            ) : (
              "Déclarer la panne"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
