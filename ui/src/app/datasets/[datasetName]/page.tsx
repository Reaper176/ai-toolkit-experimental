'use client';

import { useEffect, useState, use, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LuLoader, LuBan } from 'react-icons/lu';
import { FaChevronLeft } from 'react-icons/fa';
import { VirtuosoGrid } from 'react-virtuoso';
import DatasetImageCard from '@/components/DatasetImageCard';
import DatasetReviewEmptyState from '@/components/DatasetReviewEmptyState';
import DatasetSelectionToolbar from '@/components/DatasetSelectionToolbar';
import DatasetMaskEditor from '@/components/DatasetMaskEditor';
import DatasetSourceMissingList from '@/components/DatasetSourceMissingList';
import DatasetPresetLifecycleControls, { type LifecycleChange } from '@/components/DatasetPresetLifecycleControls';
import DatasetPresetDialog, {
  DEFAULT_DATASET_PRESET_LOADER_CONFIG,
  type DatasetPresetDialogInitialValues,
  type SavedDatasetPresetVersion,
} from '@/components/DatasetPresetDialog';
import DatasetImageViewer from '@/components/DatasetImageViewer';
import { Button } from '@headlessui/react';
import AddImagesModal, { openImagesModal, useOpenImagesModalOnDrag } from '@/components/AddImagesModal';
import { TopBar, MainContent } from '@/components/layout';
import { apiClient } from '@/utils/api';
import useSettings from '@/hooks/useSettings';
import { pathJoin } from '@/utils/basic';
import AutoCaptionButton from '@/components/AutoCaptionButton';
import DatasetActionBar from '@/components/DatasetActionBar';
import CaptionMonitor from '@/components/CaptionMonitor';
import { CreatableSelectInput } from '@/components/formInputs';
import { openConfirm } from '@/components/ConfirmModal';
import {
  applySelectionAction,
  areSelectionsEqual,
  createDirtySelectionLeaveGuard,
  filterDatasetImagesBySelection,
  filterPathsBySelection,
  getInterceptableInternalNavigationHref,
  normalizeRelativeMediaPath,
  reconcileSelection,
  type DirtySelectionLeaveGuard,
  type SelectionAction,
} from '@/helpers/datasetSelection';
import useDatasetPresets, {
  createLatestDatasetPresetRequestGate,
  type DatasetPresetDetail,
  type DatasetPresetSummary,
  type DatasetPresetVersionDetail,
} from '@/hooks/useDatasetPresets';
import { archivedMaskEditorImages, frozenMaskUrlsFromManifest, liveMaskEditorImagesForLaunch } from '@/helpers/maskEditor';

interface DatasetImageEntry {
  img_path: string;
  relative_path: string;
}

export default function DatasetPage({ params }: { params: { datasetName: string } }) {
  const [imgList, setImgList] = useState<DatasetImageEntry[]>([]);
  const [isAutoCaptioning, setIsAutoCaptioning] = useState(false);
  const usableParams = use(params as any) as { datasetName: string };
  const datasetName = usableParams.datasetName;
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { settings, isSettingsLoaded } = useSettings();
  const [selectedImgPath, setSelectedImgPath] = useState<string | null>(null);
  const [captionExt, setCaptionExt] = useState<string>('txt');
  const [captionRefreshKeys, setCaptionRefreshKeys] = useState<Record<string, number>>({});
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null);
  const [captionBarHeight, setCaptionBarHeight] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set());
  const [baseSelection, setBaseSelection] = useState<Set<string>>(() => new Set());
  const [activePreset, setActivePreset] = useState<DatasetPresetSummary | null>(null);
  const [activePresetDetail, setActivePresetDetail] = useState<DatasetPresetDetail | null>(null);
  const [activeVersion, setActiveVersion] = useState<DatasetPresetVersionDetail | null>(null);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [selectionSaving, setSelectionSaving] = useState(false);
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const [presetLoadError, setPresetLoadError] = useState<string | null>(null);
  const [maskEditorOpen, setMaskEditorOpen] = useState(false);
  const [maskEditorLaunch, setMaskEditorLaunch] = useState<{ path: string | undefined; token: number }>({ path: undefined, token: 0 });
  const [maskStatusRefreshKey, setMaskStatusRefreshKey] = useState(0);
  const { presets, error: presetError, refresh: refreshPresets, loadPreset, loadVersion } = useDatasetPresets();
  const scrollParentCallback = useCallback((el: HTMLDivElement | null) => setScrollParent(el), []);
  const isRefreshingRef = useRef(false);
  const baseSelectionRef = useRef(baseSelection);
  const selectionDirtyRef = useRef(false);
  const leaveGuardRef = useRef<DirtySelectionLeaveGuard | null>(null);
  const discardSelectionRef = useRef<() => void>(() => undefined);
  const internalNavigationPendingRef = useRef(false);
  const activeManifestPathsRef = useRef<Set<string>>(new Set());
  const presetRequestGateRef = useRef(createLatestDatasetPresetRequestGate());

  baseSelectionRef.current = baseSelection;
  const selectionDirty = selectionMode && !areSelectionsEqual(selectedPaths, baseSelection);
  selectionDirtyRef.current = selectionDirty;
  const archivedReadOnly = activePreset !== null && activePreset.archived_at !== null;
  const selectedLiveImages = useMemo(() => imgList.filter(image => selectedPaths.has(image.relative_path)), [imgList, selectedPaths]);
  const frozenMasks = useMemo(() => activeVersion ? frozenMaskUrlsFromManifest(activeVersion.id, activeVersion.manifest.files) : {}, [activeVersion]);
  const archivedEditorImages = useMemo(() => activeVersion ? archivedMaskEditorImages(activeVersion.id, activeVersion.manifest.files).filter(image => selectedPaths.has(image.relative_path)) : [], [activeVersion, selectedPaths]);
  const archivedMaskPreviewAvailable = archivedReadOnly && archivedEditorImages.length > 0;
  const liveEditorImages = useMemo(() => liveMaskEditorImagesForLaunch(imgList, selectedPaths, maskEditorLaunch.path), [imgList, selectedPaths, maskEditorLaunch.path]);
  const maskEditorImages = archivedReadOnly ? archivedEditorImages : liveEditorImages;
  const openMaskEditorAt = (path: string) => {
    setMaskEditorLaunch(current => ({ path, token: current.token + 1 }));
    setMaskEditorOpen(true);
  };
  const openMaskEditor = () => {
    const path = (archivedReadOnly ? archivedEditorImages : selectedLiveImages)[0]?.relative_path;
    if (!path) return;
    openMaskEditorAt(path);
  };
  const selectionInteractionLocked = selectionSaving || lifecyclePending || archivedReadOnly;
  activeManifestPathsRef.current = new Set(activeVersion?.manifest.files.map(file => file.source_path) ?? []);

  discardSelectionRef.current = () => {
    setSelectedPaths(new Set(baseSelectionRef.current));
    setShowOnlySelected(false);
    setSelectionMode(false);
  };

  const refreshImageList = (dbName: string) => {
    // Only allow one listImages request in flight at a time.
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setStatus('loading');
    apiClient
      .post('/api/datasets/listImages', { datasetName: dbName })
      .then((res: any) => {
        const data = res.data;
        // Server sends a shared root (with trailing OS separator) + each file's sub-path to
        // keep the payload small. Plain concat rebuilds the native absolute path on any OS.
        // Server already sorts; avoid a client-side sort on large lists.
        const root = data.root;
        if (typeof root !== 'string' || !Array.isArray(data.images)) {
          throw new Error('Dataset image list response is malformed');
        }
        const nextImages: DatasetImageEntry[] = [];
        const seenRelativePaths = new Set<string>();
        for (const subPath of data.images) {
          try {
            const relative_path = normalizeRelativeMediaPath(subPath);
            if (seenRelativePaths.has(relative_path)) {
              console.error('Skipping duplicate normalized dataset image path:', subPath);
              continue;
            }
            seenRelativePaths.add(relative_path);
            nextImages.push({ img_path: root + subPath, relative_path });
          } catch (error) {
            console.error('Skipping invalid dataset image path:', subPath, error);
          }
        }
        setImgList(nextImages);
        const availablePaths = nextImages.map(image => image.relative_path);
        setSelectedPaths(current =>
          reconcileSelection(current, [
            ...availablePaths,
            ...[...current].filter(path => activeManifestPathsRef.current.has(path)),
          ]),
        );
        setBaseSelection(current =>
          reconcileSelection(current, [
            ...availablePaths,
            ...[...current].filter(path => activeManifestPathsRef.current.has(path)),
          ]),
        );
        setStatus('success');
      })
      .catch(error => {
        console.error('Error fetching images:', error);
        setStatus('error');
      })
      .finally(() => {
        isRefreshingRef.current = false;
      });
  };
  useOpenImagesModalOnDrag(datasetName, () => refreshImageList(datasetName));

  const imgPaths = useMemo(() => imgList.map(img => img.img_path), [imgList]);
  const liveRelativePaths = useMemo(() => new Set(imgList.map(image => image.relative_path)), [imgList]);
  const sourceMissingPaths = useMemo(
    () =>
      activeVersion?.manifest.files.map(file => file.source_path).filter(path => !liveRelativePaths.has(path)) ?? [],
    [activeVersion, liveRelativePaths],
  );
  const visibleImages = useMemo(
    () => filterDatasetImagesBySelection(imgList, selectedPaths, showOnlySelected),
    [imgList, selectedPaths, showOnlySelected],
  );
  const visibleMissingPaths = useMemo(
    () => filterPathsBySelection(sourceMissingPaths, selectedPaths, showOnlySelected),
    [sourceMissingPaths, selectedPaths, showOnlySelected],
  );
  const activeManifestPaths = useMemo(
    () => new Set(activeVersion?.manifest.files.map(file => file.source_path) ?? []),
    [activeVersion],
  );
  const retainedPaths = activeVersion
    ? activeVersion.manifest.files.map(file => file.source_path).filter(path => selectedPaths.has(path))
    : [];
  const newlySelectedPaths = [...selectedPaths].filter(path => !activeManifestPaths.has(path));

  useEffect(() => {
    void refreshPresets().catch(() => undefined);
    return () => presetRequestGateRef.current.cancelCurrent();
  }, [refreshPresets]);

  const applyLoadedVersion = useCallback((version: DatasetPresetVersionDetail) => {
    const paths = new Set(version.manifest.files.map(file => file.source_path));
    setActiveVersion(version);
    setSelectedPaths(paths);
    setBaseSelection(new Set(paths));
    setCaptionExt(version.loader_config.caption_ext.replace(/^\./, ''));
    setSelectionMode(true);
  }, []);

  const confirmSelectionReplacement = (replaceSelection: () => void) => {
    if (!selectionDirty) {
      replaceSelection();
      return;
    }
    openConfirm({
      title: 'Discard selection changes?',
      message: 'Loading another preset or version will replace your unsaved selection.',
      type: 'warning',
      confirmText: 'Discard and load',
      onConfirm: replaceSelection,
    });
  };

  const loadPresetSelection = async (presetId: string) => {
    const request = presetRequestGateRef.current.begin();
    setPresetLoadError(null);
    setActivePreset(null);
    setActivePresetDetail(null);
    setActiveVersion(null);
    setBaseSelection(new Set());
    setSelectedPaths(new Set());
    if (!presetId) {
      return;
    }
    try {
      const preset = presets.find(item => item.id === presetId) ?? null;
      const detail = await loadPreset(presetId);
      if (!request.isCurrent()) return;
      setActivePreset(preset ?? detail);
      setActivePresetDetail(detail);
      const latest = [...detail.versions].sort((left, right) => right.version - left.version)[0];
      if (!latest) return;
      const version = await loadVersion(latest.id);
      if (request.isCurrent()) applyLoadedVersion(version);
    } catch (error) {
      if (!request.isCurrent()) return;
      setPresetLoadError(error instanceof Error ? error.message : 'Unable to load dataset preset');
      setActivePreset(null);
      setActivePresetDetail(null);
      setActiveVersion(null);
      setBaseSelection(new Set());
      setSelectedPaths(new Set());
    }
  };

  const selectPreset = (presetId: string) => {
    confirmSelectionReplacement(() => void loadPresetSelection(presetId));
  };

  const loadVersionSelection = async (versionId: string) => {
    const request = presetRequestGateRef.current.begin();
    setPresetLoadError(null);
    setActiveVersion(null);
    setBaseSelection(new Set());
    setSelectedPaths(new Set());
    if (!versionId) return;
    try {
      const version = await loadVersion(versionId);
      if (request.isCurrent()) applyLoadedVersion(version);
    } catch (error) {
      if (request.isCurrent()) {
        setPresetLoadError(error instanceof Error ? error.message : 'Unable to load dataset preset version');
      }
    }
  };

  const selectVersion = (versionId: string) => {
    confirmSelectionReplacement(() => void loadVersionSelection(versionId));
  };

  const handlePresetSaved = async (saved: SavedDatasetPresetVersion) => {
    await refreshPresets();
    const [detail, version] = await Promise.all([loadPreset(saved.presetId), loadVersion(saved.version.id)]);
    setActivePreset(detail);
    setActivePresetDetail(detail);
    applyLoadedVersion(version);
  };

  const handleLifecycleChanged = async (change: LifecycleChange, applyToActiveIdentity: boolean) => {
    if (!applyToActiveIdentity) {
      await refreshPresets().catch(() => undefined);
      return;
    }
    const request = presetRequestGateRef.current.begin();
    setPresetLoadError(null);
    if (change.preset && request.isCurrent()) {
      setActivePreset(change.preset);
      setActivePresetDetail(change.preset);
    }
    if (change.version && request.isCurrent()) setActiveVersion(change.version);
    try {
      await refreshPresets();
      if (!request.isCurrent()) return;
      if (change.deletedVersionId && activePresetDetail) {
        const detail = await loadPreset(activePresetDetail.id);
        if (!request.isCurrent()) return;
        if (selectionDirtyRef.current) return;
        setActivePreset(detail);
        setActivePresetDetail(detail);
        const latest = [...detail.versions].sort((left, right) => right.version - left.version)[0];
        if (!latest) {
          setActiveVersion(null);
          setBaseSelection(new Set());
          return;
        }
        const version = await loadVersion(latest.id);
        if (request.isCurrent()) applyLoadedVersion(version);
      }
    } catch (error) {
      if (request.isCurrent()) {
        setPresetLoadError(error instanceof Error ? error.message : 'Unable to refresh dataset preset state');
      }
    }
  };

  const dialogInitialValues = useMemo<DatasetPresetDialogInitialValues>(
    () => ({
      name: activePreset?.name ?? '',
      note: activeVersion?.note ?? '',
      captionExt: activeVersion?.loader_config.caption_ext ?? captionExt,
      loaderConfig: activeVersion?.loader_config ?? {
        ...DEFAULT_DATASET_PRESET_LOADER_CONFIG,
        caption_ext: captionExt,
      },
    }),
    [activePreset, activeVersion, captionExt],
  );

  useEffect(() => {
    const guard = createDirtySelectionLeaveGuard(window, () => {
      openConfirm({
        title: 'Discard selection changes?',
        message: 'Your selection changes have not been saved.',
        type: 'warning',
        confirmText: 'Discard and leave',
        onConfirm: () => {
          discardSelectionRef.current();
          leaveGuardRef.current?.allowLeave();
        },
        onCancel: () => leaveGuardRef.current?.cancelLeaveAttempt(),
      });
    });
    leaveGuardRef.current = guard;
    return () => {
      guard.dispose();
      if (leaveGuardRef.current === guard) leaveGuardRef.current = null;
    };
  }, []);

  useEffect(() => {
    leaveGuardRef.current?.setDirty(selectionDirty);
  }, [selectionDirty]);

  useEffect(() => {
    if (!selectionDirty) return;
    const onDocumentClick = (event: MouseEvent) => {
      const href = getInterceptableInternalNavigationHref(event, window.location.href);
      if (!href) return;
      event.preventDefault();
      if (internalNavigationPendingRef.current) return;
      const guard = leaveGuardRef.current;
      if (!guard) return;
      internalNavigationPendingRef.current = true;
      openConfirm({
        title: 'Discard selection changes?',
        message: 'Your selection changes have not been saved.',
        type: 'warning',
        confirmText: 'Discard and leave',
        onConfirm: () => {
          discardSelectionRef.current();
          guard.consumeSentinelBeforeNavigation(() => router.push(href));
        },
        onCancel: () => {
          internalNavigationPendingRef.current = false;
        },
      });
    };
    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [router, selectionDirty]);

  useEffect(() => {
    if (!selectionDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [selectionDirty]);

  const enterSelectionMode = () => {
    setActivePreset(null);
    setActivePresetDetail(null);
    setActiveVersion(null);
    setBaseSelection(new Set());
    setSelectedPaths(new Set());
    setSelectionMode(true);
  };

  const cancelSelectionMode = () => {
    const cancel = () => discardSelectionRef.current();
    if (!selectionDirty) {
      cancel();
      return;
    }
    openConfirm({
      title: 'Discard selection changes?',
      message: 'Your selection changes have not been saved.',
      type: 'warning',
      confirmText: 'Discard changes',
      onConfirm: cancel,
    });
  };

  const handleSelectionAction = (action: SelectionAction) => {
    if (selectionInteractionLocked) return;
    setSelectedPaths(
      applySelectionAction(selectedPaths, [...imgList.map(img => img.relative_path), ...sourceMissingPaths], action),
    );
  };

  const handlePageBack = () => {
    if (!selectionDirty) {
      history.back();
      return;
    }
    leaveGuardRef.current?.requestLeave();
  };

  useEffect(() => {
    if (datasetName) {
      refreshImageList(datasetName);
    }
  }, [datasetName]);

  const PageInfoContent = useMemo(() => {
    let icon = null;
    let text = '';
    let subtitle = '';
    let showIt = false;
    let bgColor = '';
    let textColor = '';
    let iconColor = '';

    if (status == 'loading') {
      icon = <LuLoader className="animate-spin w-8 h-8" />;
      text = 'Loading Images';
      subtitle = 'Please wait while we fetch your dataset images...';
      showIt = true;
      bgColor = 'bg-gray-800/50';
      textColor = 'text-gray-100';
      iconColor = 'text-gray-400';
    }
    if (status == 'error') {
      icon = <LuBan className="w-8 h-8" />;
      text = 'Error Loading Images';
      subtitle = 'There was a problem fetching the images. Please try refreshing the page.';
      showIt = true;
      bgColor = 'bg-red-600/20';
      textColor = 'text-red-100';
      iconColor = 'text-red-400';
    }
    if (!showIt) return null;

    return (
      <div
        className={`mt-10 flex flex-col items-center justify-center py-16 px-8 rounded-xl border-2 border-gray-700 border-dashed ${bgColor} ${textColor} mx-auto max-w-md text-center`}
      >
        <div className={`${iconColor} mb-4`}>{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{text}</h3>
        <p className="text-sm opacity-75 leading-relaxed">{subtitle}</p>
      </div>
    );
  }, [status]);

  return (
    <>
      {/* Fixed top bar */}
      <TopBar>
        <div className="flex-shrink-0">
          <Button className="text-gray-500 dark:text-gray-300 px-2 sm:px-3 mt-1" onClick={handlePageBack}>
            <FaChevronLeft />
          </Button>
        </div>
        <div className="min-w-0 flex-shrink">
          <h1 className="text-base sm:text-lg truncate">
            <span className="hidden sm:inline">Dataset: </span>
            {datasetName}
          </h1>
        </div>
        <div className="flex-1"></div>
        <div className="flex-shrink-0 flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-400 hidden sm:inline whitespace-nowrap">Caption ext</label>
            <CreatableSelectInput
              className="w-44"
              value={captionExt}
              onChange={value => setCaptionExt(value)}
              options={[
                { value: 'txt', label: 'txt' },
                { value: 'json', label: 'json' },
                { value: 'caption', label: 'caption' },
              ]}
            />
          </div>
          <AutoCaptionButton
            datasetPath={`${pathJoin(settings.DATASETS_FOLDER, datasetName)}`}
            setIsAutoCaptioning={setIsAutoCaptioning}
            captionExt={captionExt}
          />
          <Button
            className="text-white bg-slate-600 px-2 sm:px-3 py-1 rounded-md text-sm sm:text-base whitespace-nowrap"
            onClick={selectionMode ? cancelSelectionMode : enterSelectionMode}
          >
            <span className="hidden sm:inline">{selectionMode ? 'Selection' : 'Select images'}</span>
            <span className="sm:hidden">Select</span>
          </Button>
          <Button
            className="text-white bg-slate-600 px-2 sm:px-3 py-1 rounded-md text-sm sm:text-base whitespace-nowrap"
            onClick={() => openImagesModal(datasetName, () => refreshImageList(datasetName))}
          >
            <span className="sm:hidden">+ Add</span>
            <span className="hidden sm:inline">Add Images</span>
          </Button>
          <DatasetActionBar datasetName={datasetName} />
        </div>
      </TopBar>
      <MainContent
        ref={scrollParentCallback}
        belowTopBar
        className="transition-[bottom] duration-300"
        style={{ bottom: `${captionBarHeight}px` }}
      >
        {selectionMode && (
          <div className="sticky top-0 z-20 -mx-2 mb-4 sm:-mx-4">
            <section
              aria-label="Dataset preset version"
              className="flex flex-wrap items-end gap-3 border-b border-gray-700 bg-gray-900 px-3 py-2 sm:px-4"
            >
              <label className="text-xs text-gray-300">
                Preset
                <select
                  value={activePreset?.id ?? ''}
                  onChange={event => void selectPreset(event.target.value)}
                  disabled={selectionSaving || lifecyclePending}
                  className="ml-2 rounded bg-gray-800 px-2 py-1 text-sm"
                >
                  <option value="">New preset</option>
                  {activePreset &&
                    activePreset.archived_at !== null &&
                    !presets.some(preset => preset.id === activePreset.id) && (
                      <option value={activePreset.id}>{activePreset.name} (archived)</option>
                    )}
                  {presets.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-300">
                Version
                <select
                  value={activeVersion?.id ?? ''}
                  onChange={event => void selectVersion(event.target.value)}
                  disabled={!activePresetDetail || selectionSaving || lifecyclePending}
                  className="ml-2 rounded bg-gray-800 px-2 py-1 text-sm"
                >
                  <option value="">Select version</option>
                  {activePresetDetail?.versions.map(version => (
                    <option key={version.id} value={version.id}>
                      v{version.version}
                    </option>
                  ))}
                </select>
              </label>
              {activePreset && activeVersion && (
                <>
                  <p className="text-sm text-gray-200">
                    {activePreset.name} / version {activeVersion.version}
                  </p>
                  {activePresetDetail && (
                    <DatasetPresetLifecycleControls
                      preset={activePresetDetail}
                      version={activeVersion}
                      selectionDirty={selectionDirty}
                      onPendingChange={setLifecyclePending}
                      onChanged={handleLifecycleChanged}
                    />
                  )}
                </>
              )}
              {(presetError || presetLoadError) && (
                <p role="alert" className="text-sm text-red-400">
                  {presetLoadError ?? presetError}
                </p>
              )}
            </section>
            <DatasetSelectionToolbar
              selectedCount={selectedPaths.size}
              totalCount={imgList.length + sourceMissingPaths.length}
              showOnlySelected={showOnlySelected}
              onShowOnlySelectedChange={setShowOnlySelected}
              dirty={selectionDirty}
              saving={selectionSaving || lifecyclePending}
              readOnly={archivedReadOnly}
              onAction={handleSelectionAction}
              onSave={archivedReadOnly ? undefined : () => setPresetDialogOpen(true)}
              onEditMasks={(!archivedReadOnly ? selectedLiveImages.length > 0 : archivedMaskPreviewAvailable) ? openMaskEditor : undefined}
              canPreviewMasks={archivedMaskPreviewAvailable}
              onCancel={cancelSelectionMode}
            />
            {archivedReadOnly && (
              <p className="bg-gray-900 px-3 pb-2 text-xs text-amber-300">
                Archived presets are read-only. Restore this preset to save a new version.
              </p>
            )}
          </div>
        )}
        {PageInfoContent}
        <DatasetReviewEmptyState
          status={status}
          liveCount={imgList.length}
          missingCount={sourceMissingPaths.length}
          selectionMode={selectionMode}
          showOnlySelected={showOnlySelected}
          visibleLiveCount={visibleImages.length}
          visibleMissingCount={visibleMissingPaths.length}
        />
        {status === 'success' && visibleImages.length > 0 && scrollParent && (
          <VirtuosoGrid
            totalCount={visibleImages.length}
            customScrollParent={scrollParent}
            overscan={400}
            listClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            itemContent={index => {
              const img = visibleImages[index];
              if (!img) return null;
              return (
                <DatasetImageCard
                  alt="image"
                  isAutoCaptioning={isAutoCaptioning}
                  imageUrl={img.img_path}
                  onDelete={() => refreshImageList(datasetName)}
                  onImageClick={selectionMode ? undefined : () => setSelectedImgPath(img.img_path)}
                  selectionMode={selectionMode}
                  selectionDisabled={selectionInteractionLocked}
                  selected={selectedPaths.has(img.relative_path)}
                  onSelectionChange={selected => {
                    if (selectionInteractionLocked) return;
                    setSelectedPaths(current => {
                      const next = new Set(current);
                      if (selected) next.add(img.relative_path);
                      else next.delete(img.relative_path);
                      return next;
                    });
                  }}
                  captionRefreshKey={captionRefreshKeys[img.img_path] || 0}
                  observerRoot={scrollParent}
                  captionExt={captionExt}
                  maskState={archivedReadOnly && frozenMasks[img.relative_path] ? 'read-only' : 'missing'}
                  maskDatasetName={archivedReadOnly ? undefined : datasetName}
                  maskSourcePath={archivedReadOnly ? undefined : img.relative_path}
                  maskImagePath={archivedReadOnly ? img.relative_path : undefined}
                  maskStatusRefreshKey={maskStatusRefreshKey}
                  onMaskOpen={!archivedReadOnly || frozenMasks[img.relative_path] ? openMaskEditorAt : undefined}
                />
              );
            }}
            computeItemKey={index => visibleImages[index]?.relative_path ?? index}
          />
        )}
        <DatasetSourceMissingList
          paths={visibleMissingPaths}
          selectedPaths={selectedPaths}
          selectionMode={selectionMode}
          saving={selectionSaving || lifecyclePending || archivedReadOnly}
          frozenMaskPaths={new Set(Object.keys(frozenMasks))}
          onMaskOpen={archivedReadOnly ? openMaskEditorAt : undefined}
          onSelectionChange={(path, selected) =>
            !selectionInteractionLocked &&
            setSelectedPaths(current => {
              const next = new Set(current);
              if (selected) next.add(path);
              else next.delete(path);
              return next;
            })
          }
        />
        {/* Baseline gap below the last row of cards. The caption bar itself is handled by
            shrinking MainContent's bottom to the bar height, so no dynamic spacer is needed. */}
        <div className="h-6" />
        {(!archivedReadOnly || archivedMaskPreviewAvailable) && <DatasetMaskEditor
          datasetName={datasetName}
          selectedLiveImages={maskEditorImages}
          archivedReadOnly={archivedReadOnly}
          open={maskEditorOpen}
          initialImagePath={maskEditorLaunch.path}
          launchToken={maskEditorLaunch.token}
          onClose={() => setMaskEditorOpen(false)}
          onStatusRefresh={() => setMaskStatusRefreshKey(value => value + 1)}
          frozenMasks={frozenMasks}
        />}
      </MainContent>
      <AddImagesModal />
      <DatasetPresetDialog
        mode={activePreset && activeVersion ? 'version' : 'create'}
        {...(activePreset && activeVersion
          ? { presetId: activePreset.id, presetName: activePreset.name, baseVersionId: activeVersion.id }
          : {})}
        isOpen={presetDialogOpen}
        sourceDataset={datasetName}
        selectedPaths={newlySelectedPaths}
        retainedPaths={retainedPaths}
        initialValues={dialogInitialValues}
        onClose={() => setPresetDialogOpen(false)}
        onPendingChange={setSelectionSaving}
        onSaved={handlePresetSaved}
      />
      {isSettingsLoaded && (
        <CaptionMonitor
          datasetPath={`${pathJoin(settings.DATASETS_FOLDER, datasetName)}`}
          onHeightChange={setCaptionBarHeight}
        />
      )}
      <DatasetImageViewer
        imgPath={selectedImgPath}
        imageList={imgPaths}
        onChange={setSelectedImgPath}
        refreshImages={() => refreshImageList(datasetName)}
        onCaptionSaved={path => setCaptionRefreshKeys(prev => ({ ...prev, [path]: (prev[path] || 0) + 1 }))}
        captionExt={captionExt}
      />
    </>
  );
}
