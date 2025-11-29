// src/components/modals/DeclarePanneModal.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import { Card, CardHeader, CardContent, CardTitle } from "../ui/card.jsx"; // Utilisation de CardTitle
import { Button } from "../ui/button.jsx";
import { Input } from "../ui/input.jsx";
import { Textarea } from "../ui/textarea.jsx"; // Composant Textarea pour l'uniformité
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.jsx"; // Composant Select pour l'uniformité
import { Label } from "../ui/label.jsx"; // Composant Label pour l'accessibilité
import { useToast } from "../ui/use-toast.jsx";
import { X, Wrench, Camera, MapPin, Loader2, CheckCircle, AlertCircle, Zap, CarFront, Radio } from "lucide-react";

const PANNE_TYPES = [
  { value: "mécanique", label: "Mécanique", icon: Wrench },
  { value: "électrique", label: "Électrique", icon: Zap },
  { value: "crevaison", label: "Crevaison", icon: AlertCircle },
  { value: "accident", label: "Accident", icon: CarFront },
  { value: "autres", label: "Autres", icon: Radio },
];

export default function DeclarePanneModal({ open, onClose, chauffeurId, missionId, structure }) {
  const { toast } = useToast();

  const [type, setType] = useState("mécanique");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("loading"); // 'loading', 'success', 'error'

  // Récupération de la position GPS au chargement du modal
  useEffect(() => {
    if (open && navigator.geolocation) {
      setGpsStatus("loading");
      const timeout = setTimeout(() => {
        if (gpsStatus === "loading") {
          setGpsStatus("error"); // Échec si trop long
          console.warn("Délai GPS écoulé.");
        }
      }, 8000); // 8 secondes de délai maximum

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setGpsStatus("success");
        },
        (err) => {
          clearTimeout(timeout);
          console.warn("Impossible de récupérer la position :", err.message);
          setGpsStatus("error");
          // Afficher un toast discret pour l'erreur GPS
          toast({ 
            title: "Localisation GPS", 
            description: "Impossible d'obtenir la position actuelle. Veuillez vérifier les permissions.", 
            variant: "destructive",
            duration: 3000
          });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 } // Options plus précises
      );

      return () => clearTimeout(timeout);
    }
  }, [open, toast]);

  // Réinitialiser les états lors de la fermeture
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
      if (file.size > 5 * 1024 * 1024) { // Limite à 5MB
        toast({ title: "Erreur Photo", description: "Le fichier est trop volumineux (max 5MB).", variant: "destructive" });
        e.target.value = null; // Réinitialiser le champ
        setPhoto(null);
        return;
      }
      setPhoto(file);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({ title: "Erreur de validation", description: "La description est obligatoire.", variant: "destructive" });
      return;
    }
    setLoading(true);

    let photoPath = null;
    if (photo) {
      const fileExt = photo.name.split(".").pop();
      // Utiliser un chemin spécifique pour les pannes: baticom/chauffeurId/timestamp
      const storagePath = `baticom/${chauffeurId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("pannes") // Assurez-vous que ce bucket existe et est configuré
        .upload(storagePath, photo, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        toast({ title: "❌ Erreur d'Upload", description: uploadError.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      // Chemin complet dans le bucket
      photoPath = storagePath; 
    }

    const { error } = await supabase.from("alertespannes").insert({
      chauffeur_id: chauffeurId,
      mission_id: missionId,
      structure,
      typepanne: type,
      description,
      photo: photoPath,
      latitude,
      longitude,
      statut: "en_cours",
      // created_at est généré automatiquement par défaut, sinon on peut l'inclure
    });

    if (error) {
      toast({ title: "❌ Erreur de Déclaration", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Panne déclarée !", description: "Votre alerte a été transmise à la maintenance." });
      handleClose(); // Fermer et réinitialiser
    }

    setLoading(false);
  };

  if (!open) return null;

  // Affichage du statut GPS
  const GpsStatusIndicator = () => {
    switch (gpsStatus) {
      case "loading":
        return (
          <span className="flex items-center text-sm text-blue-500 dark:text-blue-400">
            <Loader2 className="animate-spin w-4 h-4 mr-2" /> Localisation en cours...
          </span>
        );
      case "success":
        return (
          <span className="flex items-center text-sm text-green-600 dark:text-green-400 font-medium">
            <CheckCircle className="w-4 h-4 mr-2" /> GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        );
      case "error":
        return (
          <span className="flex items-center text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 mr-2" /> Localisation échouée.
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 relative shadow-2xl rounded-xl border border-gray-200 dark:border-gray-700 transform transition-transform duration-300 scale-100">
        
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <Wrench className="w-6 h-6 text-red-600 dark:text-red-400" />
                Déclarer une Panne
            </CardTitle>
            <Button
                onClick={handleClose}
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Fermer"
            >
                <X size={20} className="text-gray-500 dark:text-gray-400" />
            </Button>
        </CardHeader>
        
        <CardContent className="space-y-5 pt-2">
            
            {/* Type de Panne */}
            <div className="space-y-2">
                <Label htmlFor="type-panne">Type de panne</Label>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type-panne" className="w-full">
                        <SelectValue placeholder="Sélectionner le type de panne..." />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800">
                        {PANNE_TYPES.map((p) => (
                            <SelectItem key={p.value} value={p.value} className="flex items-center">
                                <p.icon className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" /> {p.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez clairement la nature du problème (ex: Fuite d'huile, moteur qui chauffe, etc.)."
                    rows={4}
                    className="resize-none"
                />
            </div>

            {/* Photo */}
            <div className="space-y-2">
                <Label htmlFor="photo">
                    <Camera className="inline w-4 h-4 mr-2 text-gray-600 dark:text-gray-300" /> 
                    Photo (optionnelle, max 5MB)
                </Label>
                <Input type="file" id="photo" accept="image/*" onChange={handlePhotoChange} />
                {photo && <p className="text-xs text-green-500 mt-1">Fichier sélectionné : {photo.name}</p>}
            </div>

            {/* Statut GPS */}
            <div className="pt-2 flex items-center justify-between border-t dark:border-gray-700">
                <Label className="flex items-center text-gray-700 dark:text-gray-200 font-medium">
                    <MapPin className="w-4 h-4 mr-2" /> Position GPS
                </Label>
                <GpsStatusIndicator />
            </div>

            {/* Bouton de Soumission */}
            <Button 
                onClick={handleSubmit} 
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-base h-11 transition-all duration-200" 
                disabled={loading || !description.trim()}
            >
                {loading ? (
                    <span className="flex items-center">
                        <Loader2 className="animate-spin w-4 h-4 mr-2" /> Envoi de l'alerte...
                    </span>
                ) : (
                    "Déclarer l'Urgence"
                )}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}