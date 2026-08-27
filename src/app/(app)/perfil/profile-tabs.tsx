"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "./profile-form";
import { PreferencesForm } from "./preferences-form";
import { SecurityForm } from "./security-form";
import { AccountTab } from "./account-tab";
import type { PreferencesInput } from "@/lib/validation/profile";
import type { ExchangeRateRow } from "./exchange-rates-section";
import type { ProfileTab } from "./profile-tab-constants";

export function ProfileTabs({
  initialTab,
  name,
  email,
  image,
  preferences,
  exchangeRates,
}: {
  initialTab: ProfileTab;
  name: string;
  email: string;
  image: string | null;
  preferences: PreferencesInput;
  exchangeRates: ExchangeRateRow[];
}) {
  return (
    <Tabs defaultValue={initialTab} className="gap-6">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="perfil">Perfil</TabsTrigger>
        <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
        <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
        <TabsTrigger value="cuenta">Datos y cuenta</TabsTrigger>
      </TabsList>

      <TabsContent value="perfil">
        <ProfileForm name={name} email={email} image={image} />
      </TabsContent>
      <TabsContent value="preferencias">
        <PreferencesForm preferences={preferences} exchangeRates={exchangeRates} />
      </TabsContent>
      <TabsContent value="seguridad">
        <SecurityForm />
      </TabsContent>
      <TabsContent value="cuenta">
        <AccountTab email={email} />
      </TabsContent>
    </Tabs>
  );
}
