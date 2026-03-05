"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface Preferences {
  emailLowStock: boolean;
  emailOutOfStock: boolean;
  emailOverstock: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  digestMode: boolean;
  maxEmailsPerHour: number;
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/notification-preferences");
      if (res.ok) setPrefs(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  async function handleSave() {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        toast.success("Preferences saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your notification preferences</p>
      </div>

      {/* Email Alert Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Alert Types</CardTitle>
          <CardDescription>Choose which alerts you want to receive by email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Low Stock Alerts</Label>
              <p className="text-xs text-muted-foreground">When products fall below minimum stock</p>
            </div>
            <Switch
              checked={prefs.emailLowStock}
              onCheckedChange={(v) => setPrefs({ ...prefs, emailLowStock: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Out of Stock Alerts</Label>
              <p className="text-xs text-muted-foreground">When products reach zero stock</p>
            </div>
            <Switch
              checked={prefs.emailOutOfStock}
              onCheckedChange={(v) => setPrefs({ ...prefs, emailOutOfStock: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Overstock Alerts</Label>
              <p className="text-xs text-muted-foreground">When products exceed maximum stock</p>
            </div>
            <Switch
              checked={prefs.emailOverstock}
              onCheckedChange={(v) => setPrefs({ ...prefs, emailOverstock: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quiet Hours</CardTitle>
          <CardDescription>Pause notifications during specific hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Quiet Hours</Label>
            <Switch
              checked={prefs.quietHoursEnabled}
              onCheckedChange={(v) => setPrefs({ ...prefs, quietHoursEnabled: v })}
            />
          </div>
          {prefs.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qh-start">Start Time</Label>
                <Input
                  id="qh-start"
                  type="time"
                  value={prefs.quietHoursStart ?? "22:00"}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qh-end">End Time</Label>
                <Input
                  id="qh-end"
                  type="time"
                  value={prefs.quietHoursEnd ?? "07:00"}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Settings</CardTitle>
          <CardDescription>Control how and when you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Digest Mode</Label>
              <p className="text-xs text-muted-foreground">Batch notifications instead of sending instantly</p>
            </div>
            <Switch
              checked={prefs.digestMode}
              onCheckedChange={(v) => setPrefs({ ...prefs, digestMode: v })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-emails">Max Emails Per Hour</Label>
            <Input
              id="max-emails"
              type="number"
              min={1}
              max={100}
              value={prefs.maxEmailsPerHour}
              onChange={(e) => setPrefs({ ...prefs, maxEmailsPerHour: parseInt(e.target.value) || 10 })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Preferences
      </Button>
    </div>
  );
}
