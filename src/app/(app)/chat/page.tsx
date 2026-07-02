"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Columns2,
  Copy,
  Download,
  Expand,
  Gem,
  Heart,
  ImagePlus,
  Maximize2,
  Printer,
  SendHorizontal,
  Sparkles,
  Plus,
  Upload,
  Wand2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { normalizeDesignProfile, statusLabel } from "@/lib/design-profile";
import { createBriefText, downloadDesignPdf, downloadWorkshopPng } from "@/lib/export-design";
import { clearDiamondSession, loadDiamondSession, saveDiamondSession } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import { publicEnv } from "@/config/public-env";
import { BrowserLocalImageStorage, StorageValidationError, type StoredImage } from "@/services/storage";
import {
  type ChatApiResponse,
  type ChatMessage,
  type DesignBrief,
  type ConversationStage,
  type DesignProfile,
  type GeneratedConcept,
  emptyDesignProfile
} from "@/types/design";

const initialAssistantMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  createdAt: new Date().toISOString(),
  content:
    "Welcome to your private diamond atelier. Tell me the piece you imagine, or begin with the occasion, metal, and diamond shape."
};

const initialSuggestions = ["Engagement ring", "Modern pendant", "I prefer white gold", "I want an oval diamond"];
const isDemoMode = publicEnv.demoMode;
const editSuggestions = [
  "Make band thinner",
  "Change to rose gold",
  "Make it more minimal",
  "Add hidden halo",
  "Remove halo",
  "Increase center stone"
];

const profileLabels: Array<[keyof Omit<DesignProfile, "readyForGeneration">, string, string]> = [
  ["jewelryType", "Jewelry", "Jewelry"],
  ["metal", "Metal", "Metal"],
  ["diamondShape", "Stone", "Stone"],
  ["setting", "Setting", "Setting"],
  ["style", "Style", "Style"],
  ["occasion", "Occasion", "Occasion"],
  ["recipient", "Recipient", "Occasion"],
  ["bandStyle", "Band", "Setting"],
  ["budgetRange", "Budget", "Style"],
  ["notes", "Notes", "Notes"]
];

type UsageState = {
  dailyUsed: number;
  monthlyUsed: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
};

export default function ChatPage() {
  const { user, getAccessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage]);
  const [designProfile, setDesignProfile] = useState<DesignProfile>(emptyDesignProfile);
  const [stage, setStage] = useState<ConversationStage>("discovery");
  const [suggestedActions, setSuggestedActions] = useState(initialSuggestions);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [generatedConcepts, setGeneratedConcepts] = useState<GeneratedConcept[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");
  const [selectedConcept, setSelectedConcept] = useState<GeneratedConcept | null>(null);
  const [previewConcept, setPreviewConcept] = useState<GeneratedConcept | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [finalizeCandidate, setFinalizeCandidate] = useState<GeneratedConcept | null>(null);
  const [finalizedConceptId, setFinalizedConceptId] = useState("");
  const [designBrief, setDesignBrief] = useState<DesignBrief | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [revisionUnlockedIds, setRevisionUnlockedIds] = useState<Set<string>>(() => new Set());
  const [pendingUpload, setPendingUpload] = useState<StoredImage | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [usage, setUsage] = useState<UsageState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageRefreshInFlightRef = useRef(false);
  const storage = useMemo(() => new BrowserLocalImageStorage(), []);

  const sortedConcepts = useMemo(
    () =>
      [...generatedConcepts].sort((a, b) => {
        if (a.rootId === b.rootId) return a.version - b.version;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
    [generatedConcepts]
  );

  const finalizedConcept = useMemo(
    () => sortedConcepts.find((concept) => concept.id === finalizedConceptId) ?? null,
    [finalizedConceptId, sortedConcepts]
  );
  const referenceId = useMemo(
    () => (finalizedConcept ? `DIA-${new Date().getFullYear()}-${finalizedConcept.rootId.slice(0, 8).toUpperCase()}` : ""),
    [finalizedConcept]
  );

  const activeConcept = useMemo(
    () => sortedConcepts.find((concept) => concept.id === selectedConceptId) ?? sortedConcepts[0] ?? null,
    [selectedConceptId, sortedConcepts]
  );

  const visibleProfile = useMemo(
    () =>
      profileLabels
        .map(([key, label, section]) => {
          const value = designProfile[key];
          return {
            key,
            label,
            section,
            value: Array.isArray(value) ? value.join(", ") : value
          };
        })
        .filter((item) => item.value),
    [designProfile]
  );

  const completion = useMemo(() => getCompletion(designProfile), [designProfile]);
  const comparisonConcepts = comparisonIds
    .map((id) => sortedConcepts.find((concept) => concept.id === id))
    .filter((concept): concept is GeneratedConcept => Boolean(concept));

  useEffect(() => {
    const saved = loadDiamondSession();
    if (saved) {
      setMessages(saved.messages.length ? saved.messages : [initialAssistantMessage]);
      setDesignProfile(saved.designProfile);
      setStage(saved.stage);
      setSuggestedActions(cleanClientSuggestions(saved.suggestedActions));
      setGeneratedConcepts(saved.generatedConcepts);
      setSelectedConceptId(saved.selectedConceptId);
      setFinalizedConceptId(saved.finalizedConceptId);
      setDesignBrief(saved.designBrief);
      setFavoriteIds(new Set(saved.favoriteIds));
      setComparisonIds(saved.comparisonIds);
      setRevisionUnlockedIds(new Set(saved.revisionUnlockedIds));
      setSessionId(saved.sessionId ?? "");
    }
    setSessionLoaded(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setUsage(null);
      return;
    }

    void refreshUsage();
  }, [user]);

  useEffect(() => {
    if (!sessionLoaded) return;

    saveDiamondSession({
      messages,
      designProfile,
      stage,
      suggestedActions,
      generatedConcepts,
      selectedConceptId,
      finalizedConceptId,
      designBrief,
      favoriteIds: Array.from(favoriteIds),
      comparisonIds,
      revisionUnlockedIds: Array.from(revisionUnlockedIds),
      sessionId
    });
  }, [
    comparisonIds,
    designBrief,
    designProfile,
    favoriteIds,
    finalizedConceptId,
    generatedConcepts,
    messages,
    revisionUnlockedIds,
    selectedConceptId,
    sessionLoaded,
    sessionId,
    stage,
    suggestedActions
  ]);

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function refreshUsage() {
    const headers = await authHeaders();
    if (!("Authorization" in headers)) return;

    try {
      const response = await fetch("/api/usage", { headers });
      const payload = (await response.json()) as { usage?: UsageState };
      if (response.ok && payload.usage) setUsage(payload.usage);
    } catch {
      setUsage(null);
    }
  }

  async function refreshSessionImages() {
    if (!sessionId || imageRefreshInFlightRef.current) return;

    const headers = await authHeaders();
    if (!("Authorization" in headers)) return;

    imageRefreshInFlightRef.current = true;
    try {
      const response = await fetch(`/api/design-sessions/${sessionId}`, { headers });
      const payload = (await response.json()) as { images?: GeneratedConcept[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Image links could not be refreshed.");
      if (payload.images?.length) {
        setGeneratedConcepts(payload.images);
        setError("Image links were refreshed because the previous signed URLs expired.");
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Image links could not be refreshed.");
    } finally {
      imageRefreshInFlightRef.current = false;
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  useEffect(() => {
    if (!selectedConceptId && sortedConcepts[0]) {
      setSelectedConceptId(sortedConcepts[0].id);
    }
  }, [selectedConceptId, sortedConcepts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "upload") {
      setUploadOpen(true);
    }
  }, []);

  useEffect(() => {
    const previewId = previewConcept?.id;
    if (!previewId) return;

    function handleKeyDown(event: KeyboardEvent) {
      const index = sortedConcepts.findIndex((concept) => concept.id === previewId);
      if (index < 0 || !sortedConcepts.length) return;
      if (event.key === "Escape") setPreviewConcept(null);
      if (event.key === "ArrowRight") setPreviewConcept(sortedConcepts[(index + 1) % sortedConcepts.length]);
      if (event.key === "ArrowLeft") setPreviewConcept(sortedConcepts[(index - 1 + sortedConcepts.length) % sortedConcepts.length]);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewConcept, sortedConcepts]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString()
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ messages: nextMessages, designProfile, sessionId })
      });
      const payload = (await response.json()) as Partial<ChatApiResponse> & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The consultant could not respond. Please try again.");

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.assistantMessage ?? "I can continue refining the direction with you.",
          createdAt: new Date().toISOString()
        }
      ]);
      setDesignProfile(normalizeDesignProfile(payload.updatedDesignProfile));
      setStage(payload.stage ?? "discovery");
      setSuggestedActions(cleanClientSuggestions(payload.suggestedActions));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function generateConcepts() {
    if (!designProfile.readyForGeneration || isGenerating) return;
    if (!user && !(isDemoMode && !process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      setError("Sign in to save your designs and generate AI concepts.");
      return;
    }
    if (usage && (usage.dailyRemaining <= 0 || usage.monthlyRemaining <= 0)) {
      setError("You've reached today's AI image limit. Please try again tomorrow.");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-designs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ designProfile, conversationContext: messages, sessionId })
      });
      const payload = (await response.json()) as { images?: GeneratedConcept[]; error?: string; demoMode?: boolean; sessionId?: string };
      if (!response.ok) throw new Error(payload.error ?? "The design concepts could not be generated. Please try again.");
      if (!payload.images?.length) throw new Error("No design concepts were returned. Please try again.");

      setGeneratedConcepts(payload.images);
      if (payload.sessionId) setSessionId(payload.sessionId);
      setSelectedConceptId(payload.images[0].id);
      setDesignBrief(null);
      setFinalizedConceptId("");
      if (payload.demoMode) {
        setError("Demo mode is showing clearly labeled placeholder concepts because Replicate is not configured.");
      }
      await refreshUsage();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Image generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function submitEdit() {
    const instruction = editInstruction.trim();
    if (!selectedConcept || !instruction || isEditing) return;
    if (!user && !(isDemoMode && !process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      setError("Sign in to save your designs and generate AI concepts.");
      return;
    }
    if (usage && (usage.dailyRemaining <= 0 || usage.monthlyRemaining <= 0)) {
      setError("You've reached today's AI image limit. Please try again tomorrow.");
      return;
    }

    setError("");
    setIsEditing(true);

    try {
      const response = await fetch("/api/edit-design", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          imageUrl: selectedConcept.url,
          editInstruction: instruction,
          designProfile,
          sourceImageId: selectedConcept.id,
          sourceVersion: selectedConcept.version,
          rootId: selectedConcept.rootId,
          variationName: selectedConcept.variationName,
          sessionId
        })
      });
      const payload = (await response.json()) as {
        image?: GeneratedConcept;
        updatedDesignProfile?: DesignProfile;
        error?: string;
        demoMode?: boolean;
        sessionId?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "The edit could not be completed. Please try again.");
      if (!payload.image) throw new Error("No edited image was returned. Please try again.");

      setGeneratedConcepts((current) => [...current, payload.image as GeneratedConcept]);
      if (payload.sessionId) setSessionId(payload.sessionId);
      setSelectedConceptId(payload.image.id);
      setDesignProfile(normalizeDesignProfile(payload.updatedDesignProfile));
      setDesignBrief(null);
      setFinalizedConceptId("");
      if (payload.demoMode) {
        setError("Demo mode created a clearly labeled placeholder edit because Replicate is not configured.");
      }
      setSelectedConcept(null);
      setEditInstruction("");
      await refreshUsage();
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Image editing failed. Please try again.");
    } finally {
      setIsEditing(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function toggleFavorite(id: string) {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCompare(id: string) {
    setComparisonIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return [...current, id].slice(-2);
    });
  }

  async function prepareUpload(file: File) {
    setUploadError("");
    setIsProcessingUpload(true);

    try {
      setPendingUpload(await storage.store(file));
    } catch (uploadIssue) {
      setPendingUpload(null);
      setUploadError(
        uploadIssue instanceof StorageValidationError || uploadIssue instanceof Error
          ? uploadIssue.message
          : "The selected image could not be prepared."
      );
    } finally {
      setIsProcessingUpload(false);
    }
  }

  async function confirmUpload() {
    if (!pendingUpload) return;

    const id = crypto.randomUUID();
    const uploadedConcept: GeneratedConcept = {
      id,
      url: pendingUpload.url,
      version: 1,
      parentId: null,
      rootId: id,
      variationName: "Uploaded Reference",
      description: "Customer uploaded reference design",
      prompt: "",
      editInstruction: "",
      createdAt: new Date().toISOString()
    };

    let persistedConcept = uploadedConcept;
    try {
      if (user) {
        const response = await fetch("/api/design-images", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ sessionId, designProfile, concept: uploadedConcept, type: "uploaded_reference" })
        });
        const payload = (await response.json()) as { image?: GeneratedConcept; sessionId?: string; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "The uploaded reference could not be saved.");
        if (payload.image) persistedConcept = payload.image;
        if (payload.sessionId) setSessionId(payload.sessionId);
        await refreshUsage();
      }
    } catch (uploadIssue) {
      setError(uploadIssue instanceof Error ? uploadIssue.message : "The uploaded reference could not be saved.");
    }

    setGeneratedConcepts((current) => [...current, persistedConcept]);
    setSelectedConceptId(persistedConcept.id);
    setDesignBrief(null);
    setFinalizedConceptId("");
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I've added your reference design. Tell me what you'd like to change - for example, the metal, diamond shape, band thickness, halo, or overall style.",
        createdAt: new Date().toISOString()
      }
    ]);
    setDesignProfile((current) =>
      normalizeDesignProfile({
        ...current,
        notes: [...current.notes, "Uploaded reference design"],
        readyForGeneration: current.readyForGeneration
      })
    );
    setUploadOpen(false);
    setPendingUpload(null);
    setUploadError("");
  }

  async function finalizeDesign() {
    if (!finalizeCandidate || isGeneratingBrief) return;

    setError("");
    setFinalizedConceptId(finalizeCandidate.id);
    setSelectedConceptId(finalizeCandidate.id);
    setFinalizeCandidate(null);
    setIsGeneratingBrief(true);

    try {
      const nextReferenceId = `DIA-${new Date().getFullYear()}-${finalizeCandidate.rootId.slice(0, 8).toUpperCase()}`;
      const response = await fetch("/api/design-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          designProfile,
          finalizedConcept: finalizeCandidate,
          concepts: sortedConcepts,
          referenceId: nextReferenceId,
          sessionId
        })
      });
      const payload = (await response.json()) as { brief?: DesignBrief; error?: string; demoMode?: boolean; sessionId?: string };
      if (!response.ok) throw new Error(payload.error ?? "The design brief could not be generated.");
      if (!payload.brief) throw new Error("No design brief was returned.");
      setDesignBrief(payload.brief);
      if (payload.sessionId) setSessionId(payload.sessionId);
      if (payload.demoMode) {
        setError("Demo mode generated a placeholder workshop brief because OpenAI is not configured.");
      }
    } catch (briefError) {
      setError(briefError instanceof Error ? briefError.message : "The design brief could not be generated.");
    } finally {
      setIsGeneratingBrief(false);
    }
  }

  function createNewRevision(concept: GeneratedConcept) {
    setRevisionUnlockedIds((current) => new Set(current).add(concept.id));
    setSelectedConcept(concept);
    setEditInstruction("");
  }

  function resetSession() {
    clearDiamondSession();
    setMessages([
      {
        ...initialAssistantMessage,
        createdAt: new Date().toISOString()
      }
    ]);
    setDesignProfile(emptyDesignProfile);
    setStage("discovery");
    setSuggestedActions(initialSuggestions);
    setInput("");
    setIsSending(false);
    setIsGenerating(false);
    setIsEditing(false);
    setGeneratedConcepts([]);
    setSelectedConceptId("");
    setSelectedConcept(null);
    setPreviewConcept(null);
    setComparisonIds([]);
    setComparisonOpen(false);
    setUploadOpen(false);
    setFinalizeCandidate(null);
    setFinalizedConceptId("");
    setDesignBrief(null);
    setIsGeneratingBrief(false);
    setRevisionUnlockedIds(new Set());
    setPendingUpload(null);
    setUploadError("");
    setIsProcessingUpload(false);
    setEditInstruction("");
    setFavoriteIds(new Set());
    setError("");
    setSessionId("");
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] space-y-5">
      <WorkspaceHeader
        stage={stage}
        completion={completion}
          comparisonCount={comparisonConcepts.length}
          demoMode={isDemoMode}
          usage={usage}
          isSignedIn={Boolean(user)}
          onCompare={() => setComparisonOpen(true)}
          onUpload={() => setUploadOpen(true)}
          onReset={resetSession}
      />

      {error ? <LuxuryAlert message={error} onRetry={() => setError("")} /> : null}

      <div className="grid gap-5 2xl:grid-cols-[22rem_minmax(0,1fr)_24rem]">
        <ConversationPanel
          messages={messages}
          input={input}
          isSending={isSending}
          suggestions={suggestedActions}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onSuggestion={(action) => void sendMessage(action)}
          onUpload={() => setUploadOpen(true)}
          scrollRef={scrollRef}
        />

        <DesignCanvas
          activeConcept={activeConcept}
          concepts={sortedConcepts}
          isGenerating={isGenerating}
          favoriteIds={favoriteIds}
          comparisonIds={comparisonIds}
          usage={usage}
          isSignedIn={Boolean(user)}
          onSelect={setSelectedConceptId}
          onGenerate={() => void generateConcepts()}
          onEdit={(concept) => {
            setSelectedConcept(concept);
            setEditInstruction("");
          }}
          onFinalize={setFinalizeCandidate}
          onCreateRevision={createNewRevision}
          onPreview={setPreviewConcept}
          onFavorite={toggleFavorite}
          onCompare={toggleCompare}
          onUpload={() => setUploadOpen(true)}
          onImageError={() => void refreshSessionImages()}
          readyForGeneration={designProfile.readyForGeneration}
          finalizedConceptId={finalizedConceptId}
          revisionUnlockedIds={revisionUnlockedIds}
        />

        <StudioPanel
          profile={designProfile}
          stage={stage}
          completion={completion}
          visibleProfile={visibleProfile}
          concepts={sortedConcepts}
          activeConceptId={activeConcept?.id ?? ""}
          isGenerating={isGenerating}
          isGeneratingBrief={isGeneratingBrief}
          finalizedConcept={finalizedConcept}
          designBrief={designBrief}
          referenceId={referenceId}
          usage={usage}
          isSignedIn={Boolean(user)}
          onGenerate={() => void generateConcepts()}
          onUpload={() => setUploadOpen(true)}
          onSelect={setSelectedConceptId}
          onCopySummary={async () => {
            if (!designBrief || !finalizedConcept) return;
            try {
              await navigator.clipboard.writeText(createBriefText(designBrief, finalizedConcept));
            } catch {
              setError("Copy failed. Your browser may require clipboard permission.");
            }
          }}
          onCopyReference={async () => {
            try {
              if (referenceId) await navigator.clipboard.writeText(referenceId);
            } catch {
              setError("Copy failed. Your browser may require clipboard permission.");
            }
          }}
          onDownloadPdf={() => {
            if (designBrief && finalizedConcept) {
              void downloadDesignPdf({ concept: finalizedConcept, brief: designBrief, profile: designProfile }).catch(() =>
                setError("PDF export could not be completed. Try the print option as a fallback.")
              );
            }
          }}
          onDownloadPng={() => {
            if (designBrief && finalizedConcept) {
              void downloadWorkshopPng({ concept: finalizedConcept, brief: designBrief, profile: designProfile }).catch(() =>
                setError("PNG export could not be completed. The source image may block browser export.")
              );
            }
          }}
        onPrint={() => window.print()}
          onImageError={() => void refreshSessionImages()}
        />
      </div>

      <EditConceptDialog
        concept={selectedConcept}
        instruction={editInstruction}
        isEditing={isEditing}
        usage={usage}
        isSignedIn={Boolean(user)}
        onInstructionChange={setEditInstruction}
        onOpenChange={(open) => {
          if (!open && !isEditing) {
            setSelectedConcept(null);
            setEditInstruction("");
          }
        }}
        onSubmit={() => void submitEdit()}
        onImageError={() => void refreshSessionImages()}
      />

      <PreviewDialog
        concept={previewConcept}
        concepts={sortedConcepts}
        onOpenChange={(open) => {
          if (!open) setPreviewConcept(null);
        }}
        onNavigate={setPreviewConcept}
        onImageError={() => void refreshSessionImages()}
      />

      <ComparisonDialog concepts={comparisonConcepts} open={comparisonOpen} onOpenChange={setComparisonOpen} onImageError={() => void refreshSessionImages()} />
      <FinalizeDesignDialog
        concept={finalizeCandidate}
        onOpenChange={(open) => {
          if (!open) setFinalizeCandidate(null);
        }}
        onConfirm={() => void finalizeDesign()}
        onImageError={() => void refreshSessionImages()}
      />
      <UploadReferenceDialog
        open={uploadOpen}
        pendingUpload={pendingUpload}
        error={uploadError}
        isProcessing={isProcessingUpload}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) {
            setPendingUpload(null);
            setUploadError("");
          }
        }}
        onFile={prepareUpload}
        onConfirm={confirmUpload}
        onCancel={() => {
          setUploadOpen(false);
          setPendingUpload(null);
          setUploadError("");
        }}
        onBrokenImage={() => {
          setPendingUpload(null);
          setUploadError("The selected image preview could not be loaded.");
        }}
      />
    </div>
  );
}

function WorkspaceHeader({
  stage,
  completion,
  comparisonCount,
  demoMode,
  usage,
  isSignedIn,
  onCompare,
  onUpload,
  onReset
}: {
  stage: ConversationStage;
  completion: number;
  comparisonCount: number;
  demoMode: boolean;
  usage: UsageState | null;
  isSignedIn: boolean;
  onCompare: () => void;
  onUpload: () => void;
  onReset: () => void;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 rounded-3xl border bg-card/70 p-5 shadow-luxury backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between"
    >
      <div>
        <p className="text-sm text-muted-foreground">Diamond design workspace</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Atelier Concept Studio</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-full border bg-white/[0.04] px-4 py-2 text-sm text-muted-foreground">
          {completion}% Design Complete
        </div>
        <div className="rounded-full border border-diamond-champagne/30 bg-diamond-champagne/10 px-4 py-2 text-sm text-white">
          {statusLabel(stage)}
        </div>
        {demoMode ? (
          <div className="rounded-full border border-diamond-champagne/30 bg-diamond-champagne/10 px-4 py-2 text-sm text-white">
            Demo Mode
          </div>
        ) : null}
        {isSignedIn && usage ? (
          <div className="rounded-2xl border bg-white/[0.04] px-4 py-2 text-xs leading-5 text-muted-foreground">
            <p>{usage.dailyRemaining} / {usage.dailyLimit} daily image credits remaining</p>
            <p>{usage.monthlyRemaining} / {usage.monthlyLimit} monthly image credits remaining</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-diamond-champagne/30 bg-diamond-champagne/10 px-4 py-2 text-xs leading-5 text-white">
            Sign in to save your designs and generate AI concepts.
          </div>
        )}
        <Button variant="secondary" disabled={comparisonCount !== 2} onClick={onCompare}>
          <Columns2 className="h-4 w-4" />
          Compare
        </Button>
        <Button variant="secondary" onClick={onUpload}>
          <Upload className="h-4 w-4" />
          Upload Reference
        </Button>
        <Button onClick={onReset}>
          <Plus className="h-4 w-4" />
          New Design
        </Button>
      </div>
    </motion.header>
  );
}

function LuxuryAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground md:flex-row md:items-center md:justify-between"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{message}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Dismiss
      </Button>
    </motion.div>
  );
}

function ConversationPanel({
  messages,
  input,
  isSending,
  suggestions,
  onInputChange,
  onSubmit,
  onSuggestion,
  onUpload,
  scrollRef
}: {
  messages: ChatMessage[];
  input: string;
  isSending: boolean;
  suggestions: string[];
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSuggestion: (value: string) => void;
  onUpload: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  return (
    <motion.section initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="min-h-[42rem] rounded-3xl border bg-card/70 shadow-luxury backdrop-blur-xl">
      <div className="border-b p-5">
        <p className="text-sm text-muted-foreground">AI consultant</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Private Design Consultation</h2>
      </div>
      <div className="flex h-[34rem] flex-col gap-5 overflow-y-auto p-5">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} stream={message.id === lastAssistantId} />
          ))}
        </AnimatePresence>
        {isSending ? <TypingIndicator /> : null}
        <div ref={scrollRef} />
      </div>
      <div className="min-w-0 border-t p-4">
        <div className="mb-4 flex max-w-full flex-wrap gap-2 overflow-hidden">
          {suggestions.map((action) => (
            <Button
              key={action}
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSending}
              className="max-w-full whitespace-normal break-words rounded-2xl px-3 py-2 text-left leading-5"
              onClick={() => onSuggestion(action)}
            >
              <span className="line-clamp-2 max-w-[15rem]">{action}</span>
            </Button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-3 rounded-2xl border bg-background/70 p-2">
          <Button size="icon" variant="ghost" aria-label="Upload reference image" type="button" onClick={onUpload}>
            <ImagePlus className="h-5 w-5" />
          </Button>
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            disabled={isSending}
            className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
            placeholder="Describe your ideal piece..."
            aria-label="Message the diamond consultant"
          />
          <Button size="icon" aria-label="Send message" disabled={isSending || !input.trim()}>
            {isSending ? <Sparkles className="h-5 w-5 animate-pulse" /> : <SendHorizontal className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </motion.section>
  );
}

const ChatBubble = memo(function ChatBubble({ message, stream }: { message: ChatMessage; stream: boolean }) {
  const isAssistant = message.role === "assistant";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn("flex gap-4", isAssistant ? "justify-start" : "justify-end")}
    >
      {isAssistant ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
          <Gem className="h-5 w-5" />
        </div>
      ) : null}
      <div
        className={cn(
          "max-w-[92%] rounded-2xl border p-4 text-sm md:max-w-[85%]",
          isAssistant ? "bg-card text-card-foreground" : "border-white/10 bg-white/[0.06] text-white"
        )}
      >
        <p className="text-xs text-muted-foreground">{formatTime(message.createdAt)}</p>
        {stream && isAssistant ? <StreamingMessage content={message.content} /> : <RichMessage content={message.content} />}
      </div>
    </motion.div>
  );
});

function StreamingMessage({ content }: { content: string }) {
  const [visibleLength, setVisibleLength] = useState(0);

  useEffect(() => {
    setVisibleLength(0);
    const interval = window.setInterval(() => {
      setVisibleLength((current) => {
        if (current >= content.length) {
          window.clearInterval(interval);
          return current;
        }

        return Math.min(content.length, current + 4);
      });
    }, 16);

    return () => window.clearInterval(interval);
  }, [content]);

  return <RichMessage content={content.slice(0, visibleLength)} />;
}

function RichMessage({ content }: { content: string }) {
  return (
    <div className="mt-2 space-y-2 leading-7">
      {content.split("\n").map((line, index) => (
        <p key={`${line}-${index}`} className="whitespace-pre-wrap">
          {renderInlineMarkdown(line)}
        </p>
      ))}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${part}-${index}`} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
        <Sparkles className="h-5 w-5 animate-pulse" />
      </div>
      <div className="w-full max-w-md rounded-2xl border bg-card p-5">
        <p className="mb-3 text-sm text-muted-foreground">Consulting our AI designer...</p>
        <LoadingSkeleton className="mb-3 h-4 w-2/3" />
        <LoadingSkeleton className="h-4 w-1/2" />
      </div>
    </motion.div>
  );
}

function DesignCanvas({
  activeConcept,
  concepts,
  isGenerating,
  favoriteIds,
  comparisonIds,
  usage,
  isSignedIn,
  readyForGeneration,
  onSelect,
  onGenerate,
  onEdit,
  onFinalize,
  onCreateRevision,
  onPreview,
  onFavorite,
  onCompare,
  onUpload,
  onImageError,
  finalizedConceptId,
  revisionUnlockedIds
}: {
  activeConcept: GeneratedConcept | null;
  concepts: GeneratedConcept[];
  isGenerating: boolean;
  favoriteIds: Set<string>;
  comparisonIds: string[];
  usage: UsageState | null;
  isSignedIn: boolean;
  readyForGeneration: boolean;
  onSelect: (id: string) => void;
  onGenerate: () => void;
  onEdit: (concept: GeneratedConcept) => void;
  onFinalize: (concept: GeneratedConcept) => void;
  onCreateRevision: (concept: GeneratedConcept) => void;
  onPreview: (concept: GeneratedConcept) => void;
  onFavorite: (id: string) => void;
  onCompare: (id: string) => void;
  onUpload: () => void;
  onImageError: () => void;
  finalizedConceptId: string;
  revisionUnlockedIds: Set<string>;
}) {
  const activeFinalized = Boolean(activeConcept && activeConcept.id === finalizedConceptId);
  const canEditActive = Boolean(activeConcept && (!activeFinalized || revisionUnlockedIds.has(activeConcept.id)));
  const limitReached = Boolean(usage && (usage.dailyRemaining <= 0 || usage.monthlyRemaining <= 0));
  const aiDisabled = !isSignedIn || limitReached;

  return (
    <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <section className="relative min-h-[42rem] overflow-hidden rounded-3xl border bg-black/45 shadow-luxury">
        <div className="absolute inset-0 bg-diamond-radial opacity-80" />
        {activeConcept ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeConcept.id}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.25 }}
              className="relative flex min-h-[42rem] flex-col"
            >
              <div className="flex items-center justify-between gap-3 border-b bg-black/25 p-4 backdrop-blur-xl">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Primary canvas</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    V{activeConcept.version} - {activeConcept.variationName}
                  </h2>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {activeFinalized ? (
                    <div className="flex items-center gap-2 rounded-full border border-diamond-champagne/40 bg-diamond-champagne/15 px-4 py-2 text-sm text-white">
                      <Check className="h-4 w-4 text-diamond-champagne" />
                      Final Design
                    </div>
                  ) : (
                    <Button variant="secondary" onClick={() => onFinalize(activeConcept)}>
                      <Check className="h-4 w-4" />
                      Finalize
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" aria-label="Favorite concept" onClick={() => onFavorite(activeConcept.id)}>
                    <Heart className={cn("h-4 w-4", favoriteIds.has(activeConcept.id) && "fill-diamond-champagne text-diamond-champagne")} />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Open fullscreen preview" onClick={() => onPreview(activeConcept)}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  {activeFinalized && !canEditActive ? (
                    <Button variant="secondary" onClick={() => onCreateRevision(activeConcept)}>
                      <Wand2 className="h-4 w-4" />
                      Create New Revision
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled={aiDisabled} onClick={() => onEdit(activeConcept)}>
                      <Wand2 className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="group relative flex flex-1 items-center justify-center p-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onPreview(activeConcept)}
                aria-label="Open image preview"
              >
                <div className="absolute inset-10 rounded-[2rem] bg-white/10 blur-3xl transition group-hover:bg-white/15" />
                <img
                  src={activeConcept.url}
                  alt={activeConcept.variationName}
                  loading="lazy"
                  onError={onImageError}
                  className="relative max-h-[34rem] w-auto rounded-[2rem] border object-contain shadow-[0_40px_120px_rgba(0,0,0,0.65)] transition duration-300 group-hover:scale-[1.015]"
                />
              </button>
            </motion.div>
          </AnimatePresence>
        ) : (
          <CanvasEmptyState
            isGenerating={isGenerating}
            readyForGeneration={readyForGeneration}
            usage={usage}
            isSignedIn={isSignedIn}
            onGenerate={onGenerate}
            onUpload={onUpload}
          />
        )}
      </section>

      <ConceptGallery
        concepts={concepts}
        activeConceptId={activeConcept?.id ?? ""}
        favoriteIds={favoriteIds}
        comparisonIds={comparisonIds}
        usage={usage}
        isSignedIn={isSignedIn}
        onImageError={onImageError}
        finalizedConceptId={finalizedConceptId}
        revisionUnlockedIds={revisionUnlockedIds}
        isGenerating={isGenerating}
        onSelect={onSelect}
        onEdit={onEdit}
        onFinalize={onFinalize}
        onCreateRevision={onCreateRevision}
        onPreview={onPreview}
        onFavorite={onFavorite}
        onCompare={onCompare}
      />
    </motion.main>
  );
}

function CanvasEmptyState({
  isGenerating,
  readyForGeneration,
  usage,
  isSignedIn,
  onGenerate,
  onUpload
}: {
  isGenerating: boolean;
  readyForGeneration: boolean;
  usage: UsageState | null;
  isSignedIn: boolean;
  onGenerate: () => void;
  onUpload: () => void;
}) {
  const limitReached = Boolean(usage && (usage.dailyRemaining <= 0 || usage.monthlyRemaining <= 0));
  const disabledReason = !isSignedIn
    ? "Sign in to save your designs and generate AI concepts."
    : limitReached
      ? "You've reached today's AI image limit. Please try again tomorrow."
      : "";

  return (
    <div className="relative flex min-h-[42rem] items-center justify-center p-8 text-center">
      <div className="absolute inset-10 rounded-[2rem] border border-white/10 bg-white/[0.025]" />
      <div className="relative max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border bg-white/[0.06] text-diamond-champagne shadow-glow">
          {isGenerating ? <Sparkles className="h-8 w-8 animate-pulse" /> : <Gem className="h-8 w-8" />}
        </div>
        <h2 className="text-2xl font-semibold text-white">
          {isGenerating ? "Designing your diamond concepts..." : "Your primary concept will appear here"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {readyForGeneration
            ? "Generate the first visual direction, then refine the selected concept through the atelier workspace."
            : "Continue the consultation until the direction is clear enough for image concepts."}
        </p>
        {readyForGeneration ? (
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button disabled={isGenerating || Boolean(disabledReason)} onClick={onGenerate}>
              {isGenerating ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Wand2 className="h-4 w-4" />}
              Generate Diamond Concept
            </Button>
            <Button variant="secondary" onClick={onUpload}>
              <Upload className="h-4 w-4" />
              Upload Existing Design
            </Button>
          </div>
        ) : (
          <Button className="mt-6" variant="secondary" onClick={onUpload}>
            <Upload className="h-4 w-4" />
            Upload Existing Design
          </Button>
        )}
        {disabledReason ? <p className="mt-4 text-sm leading-6 text-diamond-champagne">{disabledReason}</p> : null}
        {isSignedIn && usage ? (
          <div className="mt-4 rounded-2xl border bg-white/[0.035] p-3 text-sm leading-6 text-muted-foreground">
            <p>{usage.dailyRemaining} / {usage.dailyLimit} daily image credits remaining</p>
            <p>{usage.monthlyRemaining} / {usage.monthlyLimit} monthly image credits remaining</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ConceptGallery({
  concepts,
  activeConceptId,
  favoriteIds,
  comparisonIds,
  usage,
  isSignedIn,
  onImageError,
  finalizedConceptId,
  revisionUnlockedIds,
  isGenerating,
  onSelect,
  onEdit,
  onFinalize,
  onCreateRevision,
  onPreview,
  onFavorite,
  onCompare
}: {
  concepts: GeneratedConcept[];
  activeConceptId: string;
  favoriteIds: Set<string>;
  comparisonIds: string[];
  usage: UsageState | null;
  isSignedIn: boolean;
  onImageError: () => void;
  finalizedConceptId: string;
  revisionUnlockedIds: Set<string>;
  isGenerating: boolean;
  onSelect: (id: string) => void;
  onEdit: (concept: GeneratedConcept) => void;
  onFinalize: (concept: GeneratedConcept) => void;
  onCreateRevision: (concept: GeneratedConcept) => void;
  onPreview: (concept: GeneratedConcept) => void;
  onFavorite: (id: string) => void;
  onCompare: (id: string) => void;
}) {
  const aiDisabled = !isSignedIn || Boolean(usage && (usage.dailyRemaining <= 0 || usage.monthlyRemaining <= 0));

  return (
    <section className="rounded-3xl border bg-card/70 p-4 shadow-luxury backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Concept gallery</p>
          <h3 className="mt-1 font-semibold text-white">Visual Directions</h3>
        </div>
        <p className="text-xs text-muted-foreground">{concepts.length ? `${concepts.length} versions` : "No images yet"}</p>
      </div>
      {isGenerating ? (
        <div className="grid gap-4 md:grid-cols-3">
          <LoadingSkeleton className="aspect-[4/5] rounded-3xl" />
          <LoadingSkeleton className="aspect-[4/5] rounded-3xl" />
          <LoadingSkeleton className="aspect-[4/5] rounded-3xl" />
        </div>
      ) : concepts.length ? (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {concepts.map((concept) => (
            <GalleryCard
              key={concept.id}
              concept={concept}
              selected={concept.id === activeConceptId}
              favorite={favoriteIds.has(concept.id)}
              compared={comparisonIds.includes(concept.id)}
              finalized={concept.id === finalizedConceptId}
        revisionUnlocked={revisionUnlockedIds.has(concept.id)}
        aiDisabled={aiDisabled}
        onSelect={onSelect}
              onEdit={onEdit}
              onFinalize={onFinalize}
              onCreateRevision={onCreateRevision}
              onPreview={onPreview}
              onFavorite={onFavorite}
              onCompare={onCompare}
              onImageError={onImageError}
            />
          ))}
        </motion.div>
      ) : (
        <ElegantEmptyState
          title="No visual concepts yet"
          description="Once the profile is ready, your first classic, modern, and statement concepts will collect here."
        />
      )}
    </section>
  );
}

const GalleryCard = memo(function GalleryCard({
  concept,
  selected,
  favorite,
  compared,
  finalized,
  revisionUnlocked,
  aiDisabled,
  onSelect,
  onEdit,
  onFinalize,
  onCreateRevision,
  onPreview,
  onFavorite,
  onCompare,
  onImageError
}: {
  concept: GeneratedConcept;
  selected: boolean;
  favorite: boolean;
  compared: boolean;
  finalized: boolean;
  revisionUnlocked: boolean;
  aiDisabled: boolean;
  onSelect: (id: string) => void;
  onEdit: (concept: GeneratedConcept) => void;
  onFinalize: (concept: GeneratedConcept) => void;
  onCreateRevision: (concept: GeneratedConcept) => void;
  onPreview: (concept: GeneratedConcept) => void;
  onFavorite: (id: string) => void;
  onCompare: (id: string) => void;
  onImageError: () => void;
}) {
  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className={cn("group overflow-hidden rounded-3xl border bg-white/[0.035] transition", selected && "border-diamond-champagne/70 shadow-glow")}
    >
      <div
        role="button"
        tabIndex={0}
        className="relative block aspect-[4/5] w-full cursor-pointer overflow-hidden bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSelect(concept.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(concept.id);
          }
        }}
      >
        <img src={concept.url} alt={concept.variationName} loading="lazy" onError={onImageError} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
        <div className="absolute left-3 top-3 rounded-full border bg-black/55 px-3 py-1 text-xs text-white backdrop-blur">
          V{concept.version}
        </div>
        {selected ? (
          <div className="absolute right-3 top-3 rounded-full border border-diamond-champagne/40 bg-diamond-champagne/20 px-3 py-1 text-xs text-white backdrop-blur">
            Primary
          </div>
        ) : null}
        {finalized ? (
          <div className="absolute left-3 top-12 rounded-full border border-diamond-champagne/40 bg-black/65 px-3 py-1 text-xs text-white backdrop-blur">
            Final Design
          </div>
        ) : null}
        <div className="absolute inset-x-3 bottom-3 flex translate-y-2 gap-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          <IconButton label="Expand concept" onClick={(event) => { event.stopPropagation(); onPreview(concept); }}>
            <Expand className="h-4 w-4" />
          </IconButton>
          <IconButton label="Favorite concept" active={favorite} onClick={(event) => { event.stopPropagation(); onFavorite(concept.id); }}>
            <Heart className={cn("h-4 w-4", favorite && "fill-diamond-champagne")} />
          </IconButton>
          <IconButton label="Compare concept" active={compared} onClick={(event) => { event.stopPropagation(); onCompare(concept.id); }}>
            <Columns2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{concept.variationName}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white">{concept.description}</p>
          {concept.parentId ? <p className="mt-2 text-xs text-muted-foreground">Parent: V{concept.version - 1}</p> : null}
        </div>
        <details className="group/details rounded-2xl border bg-black/20 p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-muted-foreground">
            View prompt
            <ChevronDown className="h-4 w-4 transition group-open/details:rotate-180" />
          </summary>
          <p className="mt-3 max-h-28 overflow-y-auto text-xs leading-5 text-muted-foreground">
            {concept.prompt || "Uploaded reference image. No generation prompt was used."}
          </p>
        </details>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={aiDisabled}
            onClick={() => (finalized && !revisionUnlocked ? onCreateRevision(concept) : onEdit(concept))}
          >
            <Wand2 className="h-4 w-4" />
            {finalized && !revisionUnlocked ? "Revise" : "Edit"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onFinalize(concept)} disabled={finalized}>
            <Check className="h-4 w-4" />
            Finalize
          </Button>
        </div>
      </div>
    </motion.article>
  );
});

function IconButton({
  label,
  active,
  onClick,
  children
}: {
  label: string;
  active?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn("flex h-9 w-9 items-center justify-center rounded-full border bg-black/60 text-white backdrop-blur transition hover:bg-white/15", active && "border-diamond-champagne text-diamond-champagne")}
    >
      {children}
    </button>
  );
}

function StudioPanel({
  profile,
  stage,
  completion,
  visibleProfile,
  concepts,
  activeConceptId,
  isGenerating,
  isGeneratingBrief,
  finalizedConcept,
  designBrief,
  referenceId,
  usage,
  isSignedIn,
  onGenerate,
  onUpload,
  onSelect,
  onCopySummary,
  onCopyReference,
  onDownloadPdf,
  onDownloadPng,
  onPrint
}: {
  profile: DesignProfile;
  stage: ConversationStage;
  completion: number;
  visibleProfile: Array<{ key: keyof Omit<DesignProfile, "readyForGeneration">; label: string; section: string; value: string }>;
  concepts: GeneratedConcept[];
  activeConceptId: string;
  isGenerating: boolean;
  isGeneratingBrief: boolean;
  finalizedConcept: GeneratedConcept | null;
  designBrief: DesignBrief | null;
  referenceId: string;
  usage: UsageState | null;
  isSignedIn: boolean;
  onImageError: () => void;
  onGenerate: () => void;
  onUpload: () => void;
  onSelect: (id: string) => void;
  onCopySummary: () => void;
  onCopyReference: () => void;
  onDownloadPdf: () => void;
  onDownloadPng: () => void;
  onPrint: () => void;
}) {
  const limitReached = Boolean(usage && (usage.dailyRemaining <= 0 || usage.monthlyRemaining <= 0));
  const disabledReason = !isSignedIn
    ? "Sign in to save your designs and generate AI concepts."
    : limitReached
      ? "You've reached today's AI image limit. Please try again tomorrow."
      : "";

  return (
    <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Current status</p>
              <CardTitle className="mt-1">Design Profile</CardTitle>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-white/[0.04] text-sm font-semibold text-white">
              {completion}%
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProgressBar value={completion} />
          <StageTracker stage={stage} ready={profile.readyForGeneration} />
          {visibleProfile.length ? <ProfileSummary items={visibleProfile} /> : <ElegantEmptyState title="Profile forming" description="The consultant will shape jewelry, stone, setting, style, and occasion details as you talk." compact />}
          <Button className="w-full" disabled={!profile.readyForGeneration || isGenerating || Boolean(disabledReason)} onClick={onGenerate}>
            {isGenerating ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Wand2 className="h-4 w-4" />}
            Generate Diamond Concept
          </Button>
          {disabledReason ? <p className="mt-3 text-sm leading-6 text-diamond-champagne">{disabledReason}</p> : null}
          {isSignedIn && usage ? (
            <div className="mt-3 rounded-2xl border bg-white/[0.035] p-3 text-sm leading-6 text-muted-foreground">
              <p>{usage.dailyRemaining} / {usage.dailyLimit} daily image credits remaining</p>
              <p>{usage.monthlyRemaining} / {usage.monthlyLimit} monthly image credits remaining</p>
            </div>
          ) : null}
          <Button className="w-full" variant="secondary" onClick={onUpload}>
            <Upload className="h-4 w-4" />
            Upload Existing Design
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Workshop handoff</p>
              <CardTitle className="mt-1">Design Brief</CardTitle>
            </div>
            {finalizedConcept ? (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-diamond-champagne/40 bg-diamond-champagne/15 text-diamond-champagne"
              >
                <Check className="h-5 w-5" />
              </motion.div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {finalizedConcept ? (
            <>
              <div className="rounded-2xl border border-diamond-champagne/30 bg-diamond-champagne/10 p-4">
                <p className="font-medium text-white">Design Complete</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  V{finalizedConcept.version} - {finalizedConcept.variationName}
                </p>
                <p className="mt-2 text-xs text-diamond-champagne">{referenceId}</p>
              </div>
              {isGeneratingBrief ? (
                <div className="rounded-2xl border bg-white/[0.035] p-4">
                  <LoadingSkeleton className="mb-3 h-4 w-2/3" />
                  <p className="text-sm text-muted-foreground">Preparing workshop handoff...</p>
                </div>
              ) : designBrief ? (
                <>
                  <div className="rounded-2xl border bg-white/[0.035] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Session Summary</p>
                    <p className="mt-3 text-sm leading-6 text-white">{designBrief.sessionSummary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" onClick={onDownloadPdf}>
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onDownloadPng}>
                      <Download className="h-4 w-4" />
                      PNG
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onCopySummary}>
                      <Copy className="h-4 w-4" />
                      Copy Summary
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onPrint}>
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                  </div>
                  <Button className="w-full" variant="outline" onClick={onCopyReference}>
                    <Copy className="h-4 w-4" />
                    Share Design Reference
                  </Button>
                </>
              ) : (
                <ElegantEmptyState title="Brief pending" description="The professional handoff brief will appear after GPT completes the session summary." compact />
              )}
            </>
          ) : (
            <ElegantEmptyState title="No final design yet" description="Finalize one concept to generate the workshop-ready design brief and export card." compact />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {concepts.length ? (
            <div className="space-y-3">
              {concepts.map((concept, index) => (
                <button
                  key={concept.id}
                  type="button"
                  onClick={() => onSelect(concept.id)}
                  className={cn("flex w-full gap-3 rounded-2xl border p-3 text-left transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", activeConceptId === concept.id && "border-diamond-champagne/70 bg-diamond-champagne/10")}
                >
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-black/40 text-xs text-white">V{concept.version}</div>
                    {index < concepts.length - 1 ? <div className="mt-2 h-8 w-px bg-border" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{concept.variationName}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {concept.parentId ? "Refined version" : "Original concept"}
                    </p>
                    {activeConceptId === concept.id ? <p className="mt-2 text-xs text-diamond-champagne">Current</p> : null}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <ElegantEmptyState title="No history yet" description="Your generated and refined versions will form a clickable timeline here." compact />
          )}
        </CardContent>
      </Card>
    </motion.aside>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div className="h-full rounded-full bg-diamond-champagne" initial={{ width: 0 }} animate={{ width: `${value}%` }} />
    </div>
  );
}

function StageTracker({ stage, ready }: { stage: ConversationStage; ready: boolean }) {
  const steps = ["Discovery", "Refinement", "Ready for Generation", "Refining", "Completed"];
  const activeIndex = ready ? 2 : stage === "refinement" ? 1 : 0;

  return (
    <div className="grid gap-2">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-3 text-xs">
          <span className={cn("h-2.5 w-2.5 rounded-full border", index <= activeIndex ? "border-diamond-champagne bg-diamond-champagne" : "border-muted-foreground/40")} />
          <span className={index <= activeIndex ? "text-white" : "text-muted-foreground"}>{step}</span>
        </div>
      ))}
    </div>
  );
}

function ProfileSummary({
  items
}: {
  items: Array<{ key: keyof Omit<DesignProfile, "readyForGeneration">; label: string; section: string; value: string }>;
}) {
  const sections = ["Jewelry", "Metal", "Stone", "Setting", "Style", "Occasion", "Notes"];

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const sectionItems = items.filter((item) => item.section === section);
        if (!sectionItems.length) return null;
        return (
          <div key={section} className="rounded-2xl border bg-white/[0.035] p-4">
            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{section}</p>
            <div className="space-y-3">
              {sectionItems.map((item) => (
                <div key={item.key} className="text-sm">
                  <p className="text-muted-foreground">{item.label}</p>
                  <p className="mt-1 leading-6 text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ElegantEmptyState({ title, description, compact }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={cn("rounded-3xl border bg-white/[0.025] p-6 text-center", compact && "p-4")}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border bg-white/[0.04] text-diamond-champagne">
        <Gem className="h-5 w-5" />
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function UploadReferenceDialog({
  open,
  pendingUpload,
  error,
  isProcessing,
  onOpenChange,
  onFile,
  onConfirm,
  onCancel,
  onBrokenImage
}: {
  open: boolean;
  pendingUpload: StoredImage | null;
  error: string;
  isProcessing: boolean;
  onOpenChange: (open: boolean) => void;
  onFile: (file: File) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onBrokenImage: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Upload Existing Design</DialogTitle>
          <DialogDescription>
            Add a diamond reference image as Version 1, then refine it with the same AI editing workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[1fr_18rem]">
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed bg-white/[0.025] p-8 text-center transition focus-within:ring-2 focus-within:ring-ring",
              isDragging && "border-diamond-champagne bg-diamond-champagne/10"
            )}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => handleFiles(event.target.files)}
            />
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border bg-white/[0.05] text-diamond-champagne">
              <Upload className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-white">Drop your reference image here</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              PNG, JPG, JPEG, or WEBP. Maximum 10MB. PDF, SVG, HEIC, and videos are not accepted.
            </p>
            <Button className="mt-5" type="button" variant="secondary">
              Browse Files
            </Button>
          </label>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border bg-black/40">
              {pendingUpload ? (
                <img
                  src={pendingUpload.url}
                  alt="Uploaded reference preview"
                  className="aspect-square h-full w-full object-cover"
                  onError={onBrokenImage}
                />
              ) : (
                <div className="flex aspect-square flex-col items-center justify-center p-6 text-center">
                  <Gem className="mb-4 h-8 w-8 text-diamond-champagne" />
                  <p className="text-sm text-muted-foreground">Preview appears before confirming.</p>
                </div>
              )}
            </div>

            {pendingUpload ? (
              <div className="rounded-2xl border bg-white/[0.035] p-4 text-sm">
                <p className="truncate font-medium text-white">{pendingUpload.fileName}</p>
                <p className="mt-1 text-muted-foreground">{formatBytes(pendingUpload.size)}</p>
              </div>
            ) : null}

            {isProcessing ? (
              <div className="rounded-2xl border bg-white/[0.035] p-4">
                <LoadingSkeleton className="mb-3 h-4 w-2/3" />
                <p className="text-sm text-muted-foreground">Preparing your reference design...</p>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={onCancel} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={onConfirm} disabled={!pendingUpload || isProcessing}>
                Confirm Upload
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FinalizeDesignDialog({
  concept,
  onOpenChange,
  onConfirm,
  onImageError
}: {
  concept: GeneratedConcept | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onImageError: () => void;
}) {
  return (
    <Dialog open={Boolean(concept)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Finalize This Design</DialogTitle>
          <DialogDescription>
            You are about to finalize this concept as your preferred diamond design.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {concept ? (
            <div className="overflow-hidden rounded-3xl border bg-white/[0.035]">
              <img src={concept.url} alt={concept.variationName} onError={onImageError} className="aspect-[4/3] w-full object-cover" />
              <div className="p-4">
                <p className="text-sm font-medium text-white">
                  V{concept.version} - {concept.variationName}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{concept.description}</p>
              </div>
            </div>
          ) : null}
          <div className="rounded-2xl border border-diamond-champagne/30 bg-diamond-champagne/10 p-4 text-sm leading-6 text-muted-foreground">
            This does not create a manufacturing-ready file. Your jeweler will review and refine the design before
            production.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>
              <Check className="h-4 w-4" />
              Finalize
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditConceptDialog({
  concept,
  instruction,
  isEditing,
  usage,
  isSignedIn,
  onImageError,
  onInstructionChange,
  onOpenChange,
  onSubmit
}: {
  concept: GeneratedConcept | null;
  instruction: string;
  isEditing: boolean;
  usage: UsageState | null;
  isSignedIn: boolean;
  onImageError: () => void;
  onInstructionChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) {
  const limitReached = Boolean(usage && (usage.dailyRemaining <= 0 || usage.monthlyRemaining <= 0));
  const disabledReason = !isSignedIn
    ? "Sign in to save your designs and generate AI concepts."
    : limitReached
      ? "You've reached today's AI image limit. Please try again tomorrow."
      : "";

  return (
    <Dialog open={Boolean(concept)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Refine Diamond Concept</DialogTitle>
          <DialogDescription>Describe one focused refinement. The original version will remain in your design history.</DialogDescription>
        </DialogHeader>
        {concept ? (
          <div className="grid gap-5 md:grid-cols-[18rem_1fr]">
            <div className="overflow-hidden rounded-3xl border bg-black">
              <img src={concept.url} alt={concept.variationName} onError={onImageError} className="aspect-square h-full w-full object-cover" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  V{concept.version} - {concept.variationName}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{concept.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editSuggestions.map((suggestion) => (
                  <Button key={suggestion} size="sm" variant="ghost" type="button" disabled={isEditing} onClick={() => onInstructionChange(suggestion)}>
                    {suggestion}
                  </Button>
                ))}
              </div>
              <textarea
                value={instruction}
                onChange={(event) => onInstructionChange(event.target.value)}
                disabled={isEditing}
                rows={5}
                className="w-full resize-none rounded-2xl border bg-background/70 p-4 text-sm leading-6 text-white outline-none placeholder:text-muted-foreground disabled:opacity-60"
                placeholder="Describe the change you want..."
                aria-label="Describe the design refinement"
              />
              {isEditing ? (
                <div className="rounded-2xl border bg-white/[0.035] p-4">
                  <LoadingSkeleton className="mb-3 h-4 w-2/3" />
                  <p className="text-sm text-muted-foreground">Refining your diamond concept...</p>
                </div>
              ) : null}
              {disabledReason ? <p className="text-sm leading-6 text-diamond-champagne">{disabledReason}</p> : null}
              {isSignedIn && usage ? (
                <div className="rounded-2xl border bg-white/[0.035] p-3 text-sm leading-6 text-muted-foreground">
                  <p>{usage.dailyRemaining} / {usage.dailyLimit} daily image credits remaining</p>
                  <p>{usage.monthlyRemaining} / {usage.monthlyLimit} monthly image credits remaining</p>
                </div>
              ) : null}
              <Button className="w-full" disabled={isEditing || !instruction.trim() || Boolean(disabledReason)} onClick={onSubmit}>
                {isEditing ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Wand2 className="h-4 w-4" />}
                Submit Refinement
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({
  concept,
  concepts,
  onOpenChange,
  onNavigate,
  onImageError
}: {
  concept: GeneratedConcept | null;
  concepts: GeneratedConcept[];
  onOpenChange: (open: boolean) => void;
  onNavigate: (concept: GeneratedConcept) => void;
  onImageError: () => void;
}) {
  const index = concept ? concepts.findIndex((item) => item.id === concept.id) : -1;
  const canNavigate = concepts.length > 1 && index >= 0;

  return (
    <Dialog open={Boolean(concept)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl border-white/10 bg-black/90 p-0">
        {concept ? (
          <div className="relative min-h-[80vh] overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-diamond-radial opacity-60" />
            <div className="relative flex min-h-[80vh] flex-col">
              <div className="flex items-center justify-between gap-3 border-b bg-black/35 p-4 backdrop-blur-xl">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fullscreen preview</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    V{concept.version} - {concept.variationName}
                  </h2>
                </div>
                <Button size="icon" variant="ghost" aria-label="Close preview" onClick={() => onOpenChange(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative flex flex-1 items-center justify-center p-8">
                {canNavigate ? (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute left-4 z-10"
                    aria-label="Previous concept"
                    onClick={() => onNavigate(concepts[(index - 1 + concepts.length) % concepts.length])}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                ) : null}
                <img src={concept.url} alt={concept.variationName} onError={onImageError} className="max-h-[68vh] rounded-[2rem] border object-contain shadow-luxury" />
                {canNavigate ? (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute right-4 z-10"
                    aria-label="Next concept"
                    onClick={() => onNavigate(concepts[(index + 1) % concepts.length])}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ComparisonDialog({
  concepts,
  open,
  onOpenChange,
  onImageError
}: {
  concepts: GeneratedConcept[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageError: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Compare Concepts</DialogTitle>
          <DialogDescription>Select two images from the gallery to review them side by side.</DialogDescription>
        </DialogHeader>
        {concepts.length === 2 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {concepts.map((concept, index) => (
              <div key={concept.id} className="overflow-hidden rounded-3xl border bg-white/[0.035]">
                <div className="border-b p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{index === 0 ? "Before" : "After"}</p>
                  <h3 className="mt-1 font-semibold text-white">
                    V{concept.version} - {concept.variationName}
                  </h3>
                </div>
                <img src={concept.url} alt={concept.variationName} onError={onImageError} className="aspect-square w-full object-cover" />
                <p className="p-4 text-sm leading-6 text-muted-foreground">{concept.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <ElegantEmptyState title="Choose two concepts" description="Use the compare icon on two gallery cards to open a split-screen review." />
        )}
      </DialogContent>
    </Dialog>
  );
}

function getCompletion(profile: DesignProfile) {
  const fields = [
    profile.jewelryType,
    profile.occasion,
    profile.recipient,
    profile.style,
    profile.metal,
    profile.diamondShape,
    profile.setting,
    profile.bandStyle,
    profile.budgetRange
  ];
  const base = Math.round((fields.filter(Boolean).length / fields.length) * 85);
  return Math.min(100, base + (profile.readyForGeneration ? 15 : 0));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function cleanClientSuggestions(actions: unknown): string[] {
  if (!Array.isArray(actions)) return initialSuggestions;

  const blocked = ["ask customer", "clarify", "after ", "next ", "should ", "need to", "determine", "collect"];
  const cleaned = actions
    .filter((action): action is string => typeof action === "string")
    .map((action) => action.trim())
    .filter((action) => action.length > 0 && action.length <= 36)
    .filter((action) => !blocked.some((phrase) => action.toLowerCase().includes(phrase)))
    .slice(0, 4);

  return cleaned.length ? cleaned : initialSuggestions;
}
