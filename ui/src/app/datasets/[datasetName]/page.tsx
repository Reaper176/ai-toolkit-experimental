'use client';

import { useEffect, useState, use, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LuImageOff, LuLoader, LuBan } from 'react-icons/lu';
import { FaChevronLeft } from 'react-icons/fa';
import { VirtuosoGrid } from 'react-virtuoso';
import DatasetImageCard from '@/components/DatasetImageCard';
import DatasetSelectionToolbar from '@/components/DatasetSelectionToolbar';
import DatasetImageViewer from '@/components/DatasetImageViewer';
import { Button } from '@headlessui/react';
import AddImagesModal, { openImagesModal, useOpenImagesModalOnDrag } from '@/components/AddImagesModal';
import { TopBar, MainContent } from '@/components/layout';
import { apiClient } from '@/utils/api';
import useSettings from '@/hooks/useSettings';
import { pathJoin } from '@/utils/basic';
import AutoCaptionButton from '@/components/AutoCaptionButton';
import CaptionMonitor from '@/components/CaptionMonitor';
import { CreatableSelectInput } from '@/components/formInputs';
import { openConfirm } from '@/components/ConfirmModal';
import {
  applySelectionAction,
  areSelectionsEqual,
  createDirtySelectionLeaveGuard,
  getInterceptableInternalNavigationHref,
  normalizeRelativeMediaPath,
  reconcileSelection,
  type DirtySelectionLeaveGuard,
  type SelectionAction,
} from '@/helpers/datasetSelection';

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
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set());
  const [baseSelection, setBaseSelection] = useState<Set<string>>(() => new Set());
  const scrollParentCallback = useCallback((el: HTMLDivElement | null) => setScrollParent(el), []);
  const isRefreshingRef = useRef(false);
  const baseSelectionRef = useRef(baseSelection);
  const leaveGuardRef = useRef<DirtySelectionLeaveGuard | null>(null);
  const discardSelectionRef = useRef<() => void>(() => undefined);
  const internalNavigationPendingRef = useRef(false);

  baseSelectionRef.current = baseSelection;
  const selectionDirty = selectionMode && !areSelectionsEqual(selectedPaths, baseSelection);
  const selectionSaving = false;

  discardSelectionRef.current = () => {
    setSelectedPaths(new Set(baseSelectionRef.current));
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
        setSelectedPaths(current => reconcileSelection(current, availablePaths));
        setBaseSelection(current => reconcileSelection(current, availablePaths));
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
    setSelectedPaths(applySelectionAction(selectedPaths, imgList.map(img => img.relative_path), action));
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
    if (status == 'success' && imgList.length === 0) {
      icon = <LuImageOff className="w-8 h-8" />;
      text = 'No Images Found';
      subtitle = 'This dataset is empty. Click "Add Images" to get started.';
      showIt = true;
      bgColor = 'bg-gray-800/50';
      textColor = 'text-gray-100';
      iconColor = 'text-gray-400';
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
  }, [status, imgList.length]);

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
        </div>
      </TopBar>
      <MainContent ref={scrollParentCallback}>
        {selectionMode && (
          <div className="sticky top-12 z-20 -mx-2 mb-4 sm:-mx-4">
            <DatasetSelectionToolbar
              selectedCount={selectedPaths.size}
              totalCount={imgList.length}
              dirty={selectionDirty}
              saving={selectionSaving}
              onAction={handleSelectionAction}
              onCancel={cancelSelectionMode}
            />
          </div>
        )}
        {PageInfoContent}
        {status === 'success' && imgList.length > 0 && scrollParent && (
          <VirtuosoGrid
            totalCount={imgList.length}
            customScrollParent={scrollParent}
            overscan={400}
            listClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            itemContent={index => {
              const img = imgList[index];
              if (!img) return null;
              return (
                <DatasetImageCard
                  alt="image"
                  isAutoCaptioning={isAutoCaptioning}
                  imageUrl={img.img_path}
                  onDelete={() => refreshImageList(datasetName)}
                  onImageClick={selectionMode ? undefined : () => setSelectedImgPath(img.img_path)}
                  selectionMode={selectionMode}
                  selected={selectedPaths.has(img.relative_path)}
                  onSelectionChange={selected => {
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
                />
              );
            }}
            computeItemKey={index => imgList[index]?.relative_path ?? index}
          />
        )}
        {/* Spacer so the last cards stay accessible above the floating caption bar.
            Always keeps a baseline gap, plus the bar height when it is showing. */}
        <div style={{ height: `${captionBarHeight + 24}px` }} className="transition-[height] duration-300" />
      </MainContent>
      <AddImagesModal />
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
