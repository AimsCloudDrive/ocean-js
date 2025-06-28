import {
  ClassType,
  Event as MEvent,
  IEvent,
  CSSStyle,
  PromiseLike,
} from "@msom/common";
import { IRef } from "@msom/component";

type NativeAnimationEvent = AnimationEvent;
type NativeClipboardEvent = ClipboardEvent;
type NativeCompositionEvent = CompositionEvent;
type NativeDragEvent = DragEvent;
type NativeFocusEvent = FocusEvent;
type NativeKeyboardEvent = KeyboardEvent;
type NativeMouseEvent = MouseEvent;
type NativeTouchEvent = TouchEvent;
type NativePointerEvent = PointerEvent;
type NativeToggleEvent = ToggleEvent;
type NativeTransitionEvent = TransitionEvent;
type NativeUIEvent = UIEvent;
type NativeWheelEvent = WheelEvent;

type Booleanish = boolean | "true" | "false";
type CrossOrigin = "anonymous" | "use-credentials" | "" | undefined;

declare global {
  // 转换内置元素属性：驼峰事件 -> 小写事件
  type WithLowercaseEvents<
    T extends PropAttributesSystem.DOMEventAttibuties<unknown>
  > = {
    [K in keyof T as K extends `on${infer EventName}`
      ? `on${Lowercase<EventName>}`
      : K]: K extends `on${infer EventName}`
      ? (
          event: Exclude<T[K], undefined> extends EventSystem.EventHandler<
            infer E
          >
            ? E
            : never
        ) => void
      : T[K];
  };
  interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_MSOM_NODES {}
  type MsomNode =
    | MsomElement
    | string
    | number
    | bigint
    | Iterable<MsomNode>
    | MsomPortal
    | null
    | undefined
    | DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_MSOM_NODES[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_MSOM_NODES]
    | PromiseLike<AwaitedMsomNode>;
  type AwaitedMsomNode =
    | MsomElement
    | string
    | number
    | bigint
    | Iterable<MsomNode>
    | MsomPortal
    | null
    | undefined
    | DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_MSOM_NODES[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_MSOM_NODES];

  interface MsomPortal extends MsomElement {
    children: MsomNode;
  }
  namespace EventSystem {
    interface BaseSyntheticEvent<E = object, C = any, T = any> {
      nativeEvent: E;
      currentTarget: C;
      target: T;
      bubbles: boolean;
      cancelable: boolean;
      defaultPrevented: boolean;
      eventPhase: number;
      isTrusted: boolean;
      preventDefault(): void;
      isDefaultPrevented(): boolean;
      stopPropagation(): void;
      isPropagationStopped(): boolean;
      persist(): void;
      timeStamp: number;
      type: string;
    }
    interface SyntheticEvent<T = Element, E = Event>
      extends BaseSyntheticEvent<E, EventTarget & T, T> {}

    interface ClipboardEvent<T = Element>
      extends SyntheticEvent<T, NativeClipboardEvent> {
      clipboardData: DataTransfer;
    }

    interface CompositionEvent<T = Element>
      extends SyntheticEvent<T, NativeCompositionEvent> {
      data: string;
    }

    interface DragEvent<T = Element> extends MouseEvent<T, NativeDragEvent> {
      dataTransfer: DataTransfer;
    }

    interface PointerEvent<T = Element>
      extends MouseEvent<T, NativePointerEvent> {
      pointerId: number;
      pressure: number;
      tangentialPressure: number;
      tiltX: number;
      tiltY: number;
      twist: number;
      width: number;
      height: number;
      pointerType: "mouse" | "pen" | "touch";
      isPrimary: boolean;
    }

    interface FocusEvent<Target = Element, RelatedTarget = Element>
      extends SyntheticEvent<Target, NativeFocusEvent> {
      relatedTarget: (EventTarget & RelatedTarget) | null;
      target: EventTarget & Target;
    }

    interface FormEvent<T = Element> extends SyntheticEvent<T> {}

    interface InvalidEvent<T = Element> extends SyntheticEvent<T> {
      target: EventTarget & T;
    }

    interface ChangeEvent<T = Element> extends SyntheticEvent<T> {
      target: EventTarget & T;
    }

    export type ModifierKey =
      | "Alt"
      | "AltGraph"
      | "CapsLock"
      | "Control"
      | "Fn"
      | "FnLock"
      | "Hyper"
      | "Meta"
      | "NumLock"
      | "ScrollLock"
      | "Shift"
      | "Super"
      | "Symbol"
      | "SymbolLock";

    interface KeyboardEvent<T = Element>
      extends UIEvent<T, NativeKeyboardEvent> {
      altKey: boolean;
      /** @deprecated */
      charCode: number;
      ctrlKey: boolean;
      code: string;

      getModifierState(key: ModifierKey): boolean;

      key: string;
      /** @deprecated */
      keyCode: number;
      locale: string;
      location: number;
      metaKey: boolean;
      repeat: boolean;
      shiftKey: boolean;
      /** @deprecated */
      which: number;
    }

    interface MouseEvent<T = Element, E = NativeMouseEvent>
      extends UIEvent<T, E> {
      altKey: boolean;
      button: number;
      buttons: number;
      clientX: number;
      clientY: number;
      ctrlKey: boolean;
      /**
       * See [DOM Level 3 Events spec](https://www.w3.org/TR/uievents-key/#keys-modifier). for a list of valid (case-sensitive) arguments to this method.
       */
      getModifierState(key: ModifierKey): boolean;
      metaKey: boolean;
      movementX: number;
      movementY: number;
      pageX: number;
      pageY: number;
      relatedTarget: EventTarget | null;
      screenX: number;
      screenY: number;
      shiftKey: boolean;
    }

    interface TouchEvent<T = Element> extends UIEvent<T, NativeTouchEvent> {
      altKey: boolean;
      changedTouches: TouchList;
      ctrlKey: boolean;
      /**
       * See [DOM Level 3 Events spec](https://www.w3.org/TR/uievents-key/#keys-modifier). for a list of valid (case-sensitive) arguments to this method.
       */
      getModifierState(key: ModifierKey): boolean;
      metaKey: boolean;
      shiftKey: boolean;
      targetTouches: TouchList;
      touches: TouchList;
    }
    interface AbstractView {
      styleMedia: StyleMedia;
      document: Document;
    }

    interface UIEvent<T = Element, E = NativeUIEvent>
      extends SyntheticEvent<T, E> {
      detail: number;
      view: AbstractView;
    }

    interface WheelEvent<T = Element> extends MouseEvent<T, NativeWheelEvent> {
      deltaMode: number;
      deltaX: number;
      deltaY: number;
      deltaZ: number;
    }

    interface AnimationEvent<T = Element>
      extends SyntheticEvent<T, NativeAnimationEvent> {
      animationName: string;
      elapsedTime: number;
      pseudoElement: string;
    }

    interface ToggleEvent<T = Element>
      extends SyntheticEvent<T, NativeToggleEvent> {
      oldState: "closed" | "open";
      newState: "closed" | "open";
    }

    interface TransitionEvent<T = Element>
      extends SyntheticEvent<T, NativeTransitionEvent> {
      elapsedTime: number;
      propertyName: string;
      pseudoElement: string;
    }
    type EventHandler<E extends SyntheticEvent<any>> = (event: E) => void;
    type MsomEventHandler<T = Element> = EventHandler<SyntheticEvent<T>>;
    type ClipboardEventHandler<T = Element> = EventHandler<ClipboardEvent<T>>;
    type CompositionEventHandler<T = Element> = EventHandler<
      CompositionEvent<T>
    >;
    type DragEventHandler<T = Element> = EventHandler<DragEvent<T>>;
    type FocusEventHandler<T = Element> = EventHandler<FocusEvent<T>>;
    type FormEventHandler<T = Element> = EventHandler<FormEvent<T>>;
    type ChangeEventHandler<T = Element> = EventHandler<ChangeEvent<T>>;
    type KeyboardEventHandler<T = Element> = EventHandler<KeyboardEvent<T>>;
    type MouseEventHandler<T = Element> = EventHandler<MouseEvent<T>>;
    type TouchEventHandler<T = Element> = EventHandler<TouchEvent<T>>;
    type PointerEventHandler<T = Element> = EventHandler<PointerEvent<T>>;
    type UIEventHandler<T = Element> = EventHandler<UIEvent<T>>;
    type WheelEventHandler<T = Element> = EventHandler<WheelEvent<T>>;
    type AnimationEventHandler<T = Element> = EventHandler<AnimationEvent<T>>;
    type ToggleEventHandler<T = Element> = EventHandler<ToggleEvent<T>>;
    type TransitionEventHandler<T = Element> = EventHandler<TransitionEvent<T>>;
  }
  namespace PropAttributesSystem {
    interface DOMEventAttibuties<T> {
      children?: MsomNode | undefined;
      // Clipboard Events
      onCopy?: EventSystem.ClipboardEventHandler<T> | undefined;
      onCopyCapture?: EventSystem.ClipboardEventHandler<T> | undefined;
      onCut?: EventSystem.ClipboardEventHandler<T> | undefined;
      onCutCapture?: EventSystem.ClipboardEventHandler<T> | undefined;
      onPaste?: EventSystem.ClipboardEventHandler<T> | undefined;
      onPasteCapture?: EventSystem.ClipboardEventHandler<T> | undefined;

      // Composition Events
      onCompositionEnd?: EventSystem.CompositionEventHandler<T> | undefined;
      onCompositionEndCapture?:
        | EventSystem.CompositionEventHandler<T>
        | undefined;
      onCompositionStart?: EventSystem.CompositionEventHandler<T> | undefined;
      onCompositionStartCapture?:
        | EventSystem.CompositionEventHandler<T>
        | undefined;
      onCompositionUpdate?: EventSystem.CompositionEventHandler<T> | undefined;
      onCompositionUpdateCapture?:
        | EventSystem.CompositionEventHandler<T>
        | undefined;

      // Focus Events
      onFocus?: EventSystem.FocusEventHandler<T> | undefined;
      onFocusCapture?: EventSystem.FocusEventHandler<T> | undefined;
      onBlur?: EventSystem.FocusEventHandler<T> | undefined;
      onBlurCapture?: EventSystem.FocusEventHandler<T> | undefined;

      // Form Events
      onChange?: EventSystem.FormEventHandler<T> | undefined;
      onChangeCapture?: EventSystem.FormEventHandler<T> | undefined;
      onBeforeInput?: EventSystem.FormEventHandler<T> | undefined;
      onBeforeInputCapture?: EventSystem.FormEventHandler<T> | undefined;
      onInput?: EventSystem.FormEventHandler<T> | undefined;
      onInputCapture?: EventSystem.FormEventHandler<T> | undefined;
      onReset?: EventSystem.FormEventHandler<T> | undefined;
      onResetCapture?: EventSystem.FormEventHandler<T> | undefined;
      onSubmit?: EventSystem.FormEventHandler<T> | undefined;
      onSubmitCapture?: EventSystem.FormEventHandler<T> | undefined;
      onInvalid?: EventSystem.FormEventHandler<T> | undefined;
      onInvalidCapture?: EventSystem.FormEventHandler<T> | undefined;

      // Image Events
      onLoad?: EventSystem.MsomEventHandler<T> | undefined;
      onLoadCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onError?: EventSystem.MsomEventHandler<T> | undefined; // also a Media Event
      onErrorCapture?: EventSystem.MsomEventHandler<T> | undefined; // also a Media Event

      // Keyboard Events
      onKeyDown?: EventSystem.KeyboardEventHandler<T> | undefined;
      onKeyDownCapture?: EventSystem.KeyboardEventHandler<T> | undefined;
      /** @deprecated Use `onKeyUp` or `onKeyDown` instead */
      onKeyPress?: EventSystem.KeyboardEventHandler<T> | undefined;
      /** @deprecated Use `onKeyUpCapture` or `onKeyDownCapture` instead */
      onKeyPressCapture?: EventSystem.KeyboardEventHandler<T> | undefined;
      onKeyUp?: EventSystem.KeyboardEventHandler<T> | undefined;
      onKeyUpCapture?: EventSystem.KeyboardEventHandler<T> | undefined;

      // Media Events
      onAbort?: EventSystem.MsomEventHandler<T> | undefined;
      onAbortCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onCanPlay?: EventSystem.MsomEventHandler<T> | undefined;
      onCanPlayCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onCanPlayThrough?: EventSystem.MsomEventHandler<T> | undefined;
      onCanPlayThroughCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onDurationChange?: EventSystem.MsomEventHandler<T> | undefined;
      onDurationChangeCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onEmptied?: EventSystem.MsomEventHandler<T> | undefined;
      onEmptiedCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onEncrypted?: EventSystem.MsomEventHandler<T> | undefined;
      onEncryptedCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onEnded?: EventSystem.MsomEventHandler<T> | undefined;
      onEndedCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onLoadedData?: EventSystem.MsomEventHandler<T> | undefined;
      onLoadedDataCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onLoadedMetadata?: EventSystem.MsomEventHandler<T> | undefined;
      onLoadedMetadataCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onLoadStart?: EventSystem.MsomEventHandler<T> | undefined;
      onLoadStartCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onPause?: EventSystem.MsomEventHandler<T> | undefined;
      onPauseCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onPlay?: EventSystem.MsomEventHandler<T> | undefined;
      onPlayCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onPlaying?: EventSystem.MsomEventHandler<T> | undefined;
      onPlayingCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onProgress?: EventSystem.MsomEventHandler<T> | undefined;
      onProgressCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onRateChange?: EventSystem.MsomEventHandler<T> | undefined;
      onRateChangeCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onResize?: EventSystem.MsomEventHandler<T> | undefined;
      onResizeCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onSeeked?: EventSystem.MsomEventHandler<T> | undefined;
      onSeekedCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onSeeking?: EventSystem.MsomEventHandler<T> | undefined;
      onSeekingCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onStalled?: EventSystem.MsomEventHandler<T> | undefined;
      onStalledCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onSuspend?: EventSystem.MsomEventHandler<T> | undefined;
      onSuspendCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onTimeUpdate?: EventSystem.MsomEventHandler<T> | undefined;
      onTimeUpdateCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onVolumeChange?: EventSystem.MsomEventHandler<T> | undefined;
      onVolumeChangeCapture?: EventSystem.MsomEventHandler<T> | undefined;
      onWaiting?: EventSystem.MsomEventHandler<T> | undefined;
      onWaitingCapture?: EventSystem.MsomEventHandler<T> | undefined;

      // MouseEvents
      onAuxClick?: EventSystem.MouseEventHandler<T> | undefined;
      onAuxClickCapture?: EventSystem.MouseEventHandler<T> | undefined;
      onClick?: EventSystem.MouseEventHandler<T> | undefined;
      onClickCapture?: EventSystem.MouseEventHandler<T> | undefined;
      onContextMenu?: EventSystem.MouseEventHandler<T> | undefined;
      onContextMenuCapture?: EventSystem.MouseEventHandler<T> | undefined;
      onDoubleClick?: EventSystem.MouseEventHandler<T> | undefined;
      onDoubleClickCapture?: EventSystem.MouseEventHandler<T> | undefined;
      onDrag?: EventSystem.DragEventHandler<T> | undefined;
      onDragCapture?: EventSystem.DragEventHandler<T> | undefined;
      onDragEnd?: EventSystem.DragEventHandler<T> | undefined;
      onDragEndCapture?: EventSystem.DragEventHandler<T> | undefined;
      onDragEnter?: EventSystem.DragEventHandler<T> | undefined;
      onDragEnterCapture?: EventSystem.DragEventHandler<T> | undefined;
      onDragExit?: EventSystem.DragEventHandler<T> | undefined;
      onDragExitCapture?: EventSystem.DragEventHandler<T> | undefined;
      onDragLeave?: EventSystem.DragEventHandler<T> | undefined;
      onDragLeaveCapture?: EventSystem.DragEventHandler<T> | undefined;
      onDragOver?: EventSystem.DragEventHandler<T> | undefined;
      onDragOverCapture?: EventSystem.DragEventHandler<T> | undefined;
      onDragStart?: EventSystem.DragEventHandler<T> | undefined;
      onDragStartCapture?: EventSystem.DragEventHandler<T> | undefined;
      onDrop?: EventSystem.DragEventHandler<T> | undefined;
      onDropCapture?: EventSystem.DragEventHandler<T> | undefined;
      onMouseDown?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseDownCapture?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseEnter?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseLeave?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseMove?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseMoveCapture?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseOut?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseOutCapture?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseOver?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseOverCapture?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseUp?: EventSystem.MouseEventHandler<T> | undefined;
      onMouseUpCapture?: EventSystem.MouseEventHandler<T> | undefined;

      // Selection Events
      onSelect?: EventSystem.MsomEventHandler<T> | undefined;
      onSelectCapture?: EventSystem.MsomEventHandler<T> | undefined;

      // Touch Events
      onTouchCancel?: EventSystem.TouchEventHandler<T> | undefined;
      onTouchCancelCapture?: EventSystem.TouchEventHandler<T> | undefined;
      onTouchEnd?: EventSystem.TouchEventHandler<T> | undefined;
      onTouchEndCapture?: EventSystem.TouchEventHandler<T> | undefined;
      onTouchMove?: EventSystem.TouchEventHandler<T> | undefined;
      onTouchMoveCapture?: EventSystem.TouchEventHandler<T> | undefined;
      onTouchStart?: EventSystem.TouchEventHandler<T> | undefined;
      onTouchStartCapture?: EventSystem.TouchEventHandler<T> | undefined;

      // Pointer Events
      onPointerDown?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerDownCapture?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerMove?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerMoveCapture?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerUp?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerUpCapture?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerCancel?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerCancelCapture?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerEnter?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerLeave?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerOver?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerOverCapture?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerOut?: EventSystem.PointerEventHandler<T> | undefined;
      onPointerOutCapture?: EventSystem.PointerEventHandler<T> | undefined;
      onGotPointerCapture?: EventSystem.PointerEventHandler<T> | undefined;
      onGotPointerCaptureCapture?:
        | EventSystem.PointerEventHandler<T>
        | undefined;
      onLostPointerCapture?: EventSystem.PointerEventHandler<T> | undefined;
      onLostPointerCaptureCapture?:
        | EventSystem.PointerEventHandler<T>
        | undefined;

      // UI Events
      onScroll?: EventSystem.UIEventHandler<T> | undefined;
      onScrollCapture?: EventSystem.UIEventHandler<T> | undefined;

      // Wheel Events
      onWheel?: EventSystem.WheelEventHandler<T> | undefined;
      onWheelCapture?: EventSystem.WheelEventHandler<T> | undefined;

      // Animation Events
      onAnimationStart?: EventSystem.AnimationEventHandler<T> | undefined;
      onAnimationStartCapture?:
        | EventSystem.AnimationEventHandler<T>
        | undefined;
      onAnimationEnd?: EventSystem.AnimationEventHandler<T> | undefined;
      onAnimationEndCapture?: EventSystem.AnimationEventHandler<T> | undefined;
      onAnimationIteration?: EventSystem.AnimationEventHandler<T> | undefined;
      onAnimationIterationCapture?:
        | EventSystem.AnimationEventHandler<T>
        | undefined;

      // Toggle Events
      onToggle?: EventSystem.ToggleEventHandler<T> | undefined;
      onBeforeToggle?: EventSystem.ToggleEventHandler<T> | undefined;

      // Transition Events
      onTransitionCancel?: EventSystem.TransitionEventHandler<T> | undefined;
      onTransitionCancelCapture?:
        | EventSystem.TransitionEventHandler<T>
        | undefined;
      onTransitionEnd?: EventSystem.TransitionEventHandler<T> | undefined;
      onTransitionEndCapture?:
        | EventSystem.TransitionEventHandler<T>
        | undefined;
      onTransitionRun?: EventSystem.TransitionEventHandler<T> | undefined;
      onTransitionRunCapture?:
        | EventSystem.TransitionEventHandler<T>
        | undefined;
      onTransitionStart?: EventSystem.TransitionEventHandler<T> | undefined;
      onTransitionStartCapture?:
        | EventSystem.TransitionEventHandler<T>
        | undefined;
    }
    interface AriaAttributes {
      /** Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. */
      "aria-activedescendant"?: string | undefined;
      /** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
      "aria-atomic"?: Booleanish | undefined;
      /**
       * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
       * presented if they are made.
       */
      "aria-autocomplete"?: "none" | "inline" | "list" | "both" | undefined;
      /** Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user. */
      /**
       * Defines a string value that labels the current element, which is intended to be converted into Braille.
       * @see aria-label.
       */
      "aria-braillelabel"?: string | undefined;
      /**
       * Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille.
       * @see aria-roledescription.
       */
      "aria-brailleroledescription"?: string | undefined;
      "aria-busy"?: Booleanish | undefined;
      /**
       * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
       * @see aria-pressed @see aria-selected.
       */
      "aria-checked"?: boolean | "false" | "mixed" | "true" | undefined;
      /**
       * Defines the total number of columns in a table, grid, or treegrid.
       * @see aria-colindex.
       */
      "aria-colcount"?: number | undefined;
      /**
       * Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
       * @see aria-colcount @see aria-colspan.
       */
      "aria-colindex"?: number | undefined;
      /**
       * Defines a human readable text alternative of aria-colindex.
       * @see aria-rowindextext.
       */
      "aria-colindextext"?: string | undefined;
      /**
       * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
       * @see aria-colindex @see aria-rowspan.
       */
      "aria-colspan"?: number | undefined;
      /**
       * Identifies the element (or elements) whose contents or presence are controlled by the current element.
       * @see aria-owns.
       */
      "aria-controls"?: string | undefined;
      /** Indicates the element that represents the current item within a container or set of related elements. */
      "aria-current"?:
        | boolean
        | "false"
        | "true"
        | "page"
        | "step"
        | "location"
        | "date"
        | "time"
        | undefined;
      /**
       * Identifies the element (or elements) that describes the object.
       * @see aria-labelledby
       */
      "aria-describedby"?: string | undefined;
      /**
       * Defines a string value that describes or annotates the current element.
       * @see related aria-describedby.
       */
      "aria-description"?: string | undefined;
      /**
       * Identifies the element that provides a detailed, extended description for the object.
       * @see aria-describedby.
       */
      "aria-details"?: string | undefined;
      /**
       * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
       * @see aria-hidden @see aria-readonly.
       */
      "aria-disabled"?: Booleanish | undefined;
      /**
       * Indicates what functions can be performed when a dragged object is released on the drop target.
       * @deprecated in ARIA 1.1
       */
      "aria-dropeffect"?:
        | "none"
        | "copy"
        | "execute"
        | "link"
        | "move"
        | "popup"
        | undefined;
      /**
       * Identifies the element that provides an error message for the object.
       * @see aria-invalid @see aria-describedby.
       */
      "aria-errormessage"?: string | undefined;
      /** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
      "aria-expanded"?: Booleanish | undefined;
      /**
       * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
       * allows assistive technology to override the general default of reading in document source order.
       */
      "aria-flowto"?: string | undefined;
      /**
       * Indicates an element's "grabbed" state in a drag-and-drop operation.
       * @deprecated in ARIA 1.1
       */
      "aria-grabbed"?: Booleanish | undefined;
      /** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
      "aria-haspopup"?:
        | boolean
        | "false"
        | "true"
        | "menu"
        | "listbox"
        | "tree"
        | "grid"
        | "dialog"
        | undefined;
      /**
       * Indicates whether the element is exposed to an accessibility API.
       * @see aria-disabled.
       */
      "aria-hidden"?: Booleanish | undefined;
      /**
       * Indicates the entered value does not conform to the format expected by the application.
       * @see aria-errormessage.
       */
      "aria-invalid"?:
        | boolean
        | "false"
        | "true"
        | "grammar"
        | "spelling"
        | undefined;
      /** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
      "aria-keyshortcuts"?: string | undefined;
      /**
       * Defines a string value that labels the current element.
       * @see aria-labelledby.
       */
      "aria-label"?: string | undefined;
      /**
       * Identifies the element (or elements) that labels the current element.
       * @see aria-describedby.
       */
      "aria-labelledby"?: string | undefined;
      /** Defines the hierarchical level of an element within a structure. */
      "aria-level"?: number | undefined;
      /** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
      "aria-live"?: "off" | "assertive" | "polite" | undefined;
      /** Indicates whether an element is modal when displayed. */
      "aria-modal"?: Booleanish | undefined;
      /** Indicates whether a text box accepts multiple lines of input or only a single line. */
      "aria-multiline"?: Booleanish | undefined;
      /** Indicates that the user may select more than one item from the current selectable descendants. */
      "aria-multiselectable"?: Booleanish | undefined;
      /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
      "aria-orientation"?: "horizontal" | "vertical" | undefined;
      /**
       * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
       * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
       * @see aria-controls.
       */
      "aria-owns"?: string | undefined;
      /**
       * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
       * A hint could be a sample value or a brief description of the expected format.
       */
      "aria-placeholder"?: string | undefined;
      /**
       * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
       * @see aria-setsize.
       */
      "aria-posinset"?: number | undefined;
      /**
       * Indicates the current "pressed" state of toggle buttons.
       * @see aria-checked @see aria-selected.
       */
      "aria-pressed"?: boolean | "false" | "mixed" | "true" | undefined;
      /**
       * Indicates that the element is not editable, but is otherwise operable.
       * @see aria-disabled.
       */
      "aria-readonly"?: Booleanish | undefined;
      /**
       * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
       * @see aria-atomic.
       */
      "aria-relevant"?:
        | "additions"
        | "additions removals"
        | "additions text"
        | "all"
        | "removals"
        | "removals additions"
        | "removals text"
        | "text"
        | "text additions"
        | "text removals"
        | undefined;
      /** Indicates that user input is required on the element before a form may be submitted. */
      "aria-required"?: Booleanish | undefined;
      /** Defines a human-readable, author-localized description for the role of an element. */
      "aria-roledescription"?: string | undefined;
      /**
       * Defines the total number of rows in a table, grid, or treegrid.
       * @see aria-rowindex.
       */
      "aria-rowcount"?: number | undefined;
      /**
       * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
       * @see aria-rowcount @see aria-rowspan.
       */
      "aria-rowindex"?: number | undefined;
      /**
       * Defines a human readable text alternative of aria-rowindex.
       * @see aria-colindextext.
       */
      "aria-rowindextext"?: string | undefined;
      /**
       * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
       * @see aria-rowindex @see aria-colspan.
       */
      "aria-rowspan"?: number | undefined;
      /**
       * Indicates the current "selected" state of various widgets.
       * @see aria-checked @see aria-pressed.
       */
      "aria-selected"?: Booleanish | undefined;
      /**
       * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
       * @see aria-posinset.
       */
      "aria-setsize"?: number | undefined;
      /** Indicates if items in a table or grid are sorted in ascending or descending order. */
      "aria-sort"?: "none" | "ascending" | "descending" | "other" | undefined;
      /** Defines the maximum allowed value for a range widget. */
      "aria-valuemax"?: number | undefined;
      /** Defines the minimum allowed value for a range widget. */
      "aria-valuemin"?: number | undefined;
      /**
       * Defines the current value for a range widget.
       * @see aria-valuetext.
       */
      "aria-valuenow"?: number | undefined;
      /** Defines the human readable text alternative of aria-valuenow for a range widget. */
      "aria-valuetext"?: string | undefined;
    }
    interface Attributes {
      $key?: string | number | bigint | null | undefined;
      $context?: Partial<Component.Context>;
    }
    interface RefAttributes<T> extends Attributes {
      $ref?: IRef<T> | IRef<T>[];
    }
    type TE<T> = T extends IComponent<any, infer E> ? E : {};
    interface ClassAttributes<T> extends RefAttributes<T> {}
    type AriaRole =
      | "alert"
      | "alertdialog"
      | "application"
      | "article"
      | "banner"
      | "button"
      | "cell"
      | "checkbox"
      | "columnheader"
      | "combobox"
      | "complementary"
      | "contentinfo"
      | "definition"
      | "dialog"
      | "directory"
      | "document"
      | "feed"
      | "figure"
      | "form"
      | "grid"
      | "gridcell"
      | "group"
      | "heading"
      | "img"
      | "link"
      | "list"
      | "listbox"
      | "listitem"
      | "log"
      | "main"
      | "marquee"
      | "math"
      | "menu"
      | "menubar"
      | "menuitem"
      | "menuitemcheckbox"
      | "menuitemradio"
      | "navigation"
      | "none"
      | "note"
      | "option"
      | "presentation"
      | "progressbar"
      | "radio"
      | "radiogroup"
      | "region"
      | "row"
      | "rowgroup"
      | "rowheader"
      | "scrollbar"
      | "search"
      | "searchbox"
      | "separator"
      | "slider"
      | "spinbutton"
      | "status"
      | "switch"
      | "tab"
      | "table"
      | "tablist"
      | "tabpanel"
      | "term"
      | "textbox"
      | "timer"
      | "toolbar"
      | "tooltip"
      | "tree"
      | "treegrid"
      | "treeitem"
      | (string & {});
    interface HTMLAttributes<T> extends AriaAttributes, DOMEventAttibuties<T> {
      // React-specific Attributes
      defaultChecked?: boolean | undefined;
      defaultValue?: string | number | readonly string[] | undefined;
      suppressContentEditableWarning?: boolean | undefined;
      suppressHydrationWarning?: boolean | undefined;

      // Standard HTML Attributes
      accessKey?: string | undefined;
      autoCapitalize?:
        | "off"
        | "none"
        | "on"
        | "sentences"
        | "words"
        | "characters"
        | undefined
        | (string & {});
      autoFocus?: boolean | undefined;
      class?: ClassType | undefined;
      className?: string | undefined;
      contentEditable?: Booleanish | "inherit" | "plaintext-only" | undefined;
      contextMenu?: string | undefined;
      dir?: string | undefined;
      draggable?: Booleanish | undefined;
      enterKeyHint?:
        | "enter"
        | "done"
        | "go"
        | "next"
        | "previous"
        | "search"
        | "send"
        | undefined;
      hidden?: boolean | undefined;
      id?: string | undefined;
      lang?: string | undefined;
      nonce?: string | undefined;
      slot?: string | undefined;
      spellCheck?: Booleanish | undefined;
      style?: CSSStyle | undefined;
      tabIndex?: number | undefined;
      title?: string | undefined;
      translate?: "yes" | "no" | undefined;

      // Unknown
      radioGroup?: string | undefined; // <command>, <menuitem>

      // WAI-ARIA
      role?: AriaRole | undefined;

      // RDFa Attributes
      about?: string | undefined;
      content?: string | undefined;
      datatype?: string | undefined;
      inlist?: any;
      prefix?: string | undefined;
      property?: string | undefined;
      rel?: string | undefined;
      resource?: string | undefined;
      rev?: string | undefined;
      typeof?: string | undefined;
      vocab?: string | undefined;

      // Non-standard Attributes
      autoCorrect?: string | undefined;
      autoSave?: string | undefined;
      color?: string | undefined;
      itemProp?: string | undefined;
      itemScope?: boolean | undefined;
      itemType?: string | undefined;
      itemID?: string | undefined;
      itemRef?: string | undefined;
      results?: number | undefined;
      security?: string | undefined;
      unselectable?: "on" | "off" | undefined;

      // Popover API
      popover?: "" | "auto" | "manual" | undefined;
      popoverTargetAction?: "toggle" | "show" | "hide" | undefined;
      popoverTarget?: string | undefined;

      // Living Standard
      /**
       * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert
       */
      inert?: boolean | undefined;
      /**
       * Hints at the type of data that might be entered by the user while editing the element or its contents
       * @see {@link https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute}
       */
      inputMode?:
        | "none"
        | "text"
        | "tel"
        | "url"
        | "email"
        | "numeric"
        | "decimal"
        | "search"
        | undefined;
      /**
       * Specify that a standard HTML element should behave like a defined custom built-in element
       * @see {@link https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is}
       */
      is?: string | undefined;
    }
    interface SVGAttributes<T> extends AriaAttributes, DOMEventAttibuties<T> {
      // React-specific Attributes
      suppressHydrationWarning?: boolean | undefined;

      // Attributes which also defined in HTMLAttributes
      // See comment in SVGDOMPropertyConfig.js
      className?: string | undefined;
      color?: string | undefined;
      height?: number | string | undefined;
      id?: string | undefined;
      lang?: string | undefined;
      max?: number | string | undefined;
      media?: string | undefined;
      method?: string | undefined;
      min?: number | string | undefined;
      name?: string | undefined;
      style?: CSSStyle | undefined;
      target?: string | undefined;
      type?: string | undefined;
      width?: number | string | undefined;

      // Other HTML properties supported by SVG elements in browsers
      role?: AriaRole | undefined;
      tabIndex?: number | undefined;
      crossOrigin?: CrossOrigin;

      // SVG Specific attributes
      accentHeight?: number | string | undefined;
      accumulate?: "none" | "sum" | undefined;
      additive?: "replace" | "sum" | undefined;
      alignmentBaseline?:
        | "auto"
        | "baseline"
        | "before-edge"
        | "text-before-edge"
        | "middle"
        | "central"
        | "after-edge"
        | "text-after-edge"
        | "ideographic"
        | "alphabetic"
        | "hanging"
        | "mathematical"
        | "inherit"
        | undefined;
      allowReorder?: "no" | "yes" | undefined;
      alphabetic?: number | string | undefined;
      amplitude?: number | string | undefined;
      arabicForm?: "initial" | "medial" | "terminal" | "isolated" | undefined;
      ascent?: number | string | undefined;
      attributeName?: string | undefined;
      attributeType?: string | undefined;
      autoReverse?: Booleanish | undefined;
      azimuth?: number | string | undefined;
      baseFrequency?: number | string | undefined;
      baselineShift?: number | string | undefined;
      baseProfile?: number | string | undefined;
      bbox?: number | string | undefined;
      begin?: number | string | undefined;
      bias?: number | string | undefined;
      by?: number | string | undefined;
      calcMode?: number | string | undefined;
      capHeight?: number | string | undefined;
      clip?: number | string | undefined;
      clipPath?: string | undefined;
      clipPathUnits?: number | string | undefined;
      clipRule?: number | string | undefined;
      colorInterpolation?: number | string | undefined;
      colorInterpolationFilters?:
        | "auto"
        | "sRGB"
        | "linearRGB"
        | "inherit"
        | undefined;
      colorProfile?: number | string | undefined;
      colorRendering?: number | string | undefined;
      contentScriptType?: number | string | undefined;
      contentStyleType?: number | string | undefined;
      cursor?: number | string | undefined;
      cx?: number | string | undefined;
      cy?: number | string | undefined;
      d?: string | undefined;
      decelerate?: number | string | undefined;
      descent?: number | string | undefined;
      diffuseConstant?: number | string | undefined;
      direction?: number | string | undefined;
      display?: number | string | undefined;
      divisor?: number | string | undefined;
      dominantBaseline?: number | string | undefined;
      dur?: number | string | undefined;
      dx?: number | string | undefined;
      dy?: number | string | undefined;
      edgeMode?: number | string | undefined;
      elevation?: number | string | undefined;
      enableBackground?: number | string | undefined;
      end?: number | string | undefined;
      exponent?: number | string | undefined;
      externalResourcesRequired?: Booleanish | undefined;
      fill?: string | undefined;
      fillOpacity?: number | string | undefined;
      fillRule?: "nonzero" | "evenodd" | "inherit" | undefined;
      filter?: string | undefined;
      filterRes?: number | string | undefined;
      filterUnits?: number | string | undefined;
      floodColor?: number | string | undefined;
      floodOpacity?: number | string | undefined;
      focusable?: Booleanish | "auto" | undefined;
      fontFamily?: string | undefined;
      fontSize?: number | string | undefined;
      fontSizeAdjust?: number | string | undefined;
      fontStretch?: number | string | undefined;
      fontStyle?: number | string | undefined;
      fontVariant?: number | string | undefined;
      fontWeight?: number | string | undefined;
      format?: number | string | undefined;
      fr?: number | string | undefined;
      from?: number | string | undefined;
      fx?: number | string | undefined;
      fy?: number | string | undefined;
      g1?: number | string | undefined;
      g2?: number | string | undefined;
      glyphName?: number | string | undefined;
      glyphOrientationHorizontal?: number | string | undefined;
      glyphOrientationVertical?: number | string | undefined;
      glyphRef?: number | string | undefined;
      gradientTransform?: string | undefined;
      gradientUnits?: string | undefined;
      hanging?: number | string | undefined;
      horizAdvX?: number | string | undefined;
      horizOriginX?: number | string | undefined;
      href?: string | undefined;
      ideographic?: number | string | undefined;
      imageRendering?: number | string | undefined;
      in2?: number | string | undefined;
      in?: string | undefined;
      intercept?: number | string | undefined;
      k1?: number | string | undefined;
      k2?: number | string | undefined;
      k3?: number | string | undefined;
      k4?: number | string | undefined;
      k?: number | string | undefined;
      kernelMatrix?: number | string | undefined;
      kernelUnitLength?: number | string | undefined;
      kerning?: number | string | undefined;
      keyPoints?: number | string | undefined;
      keySplines?: number | string | undefined;
      keyTimes?: number | string | undefined;
      lengthAdjust?: number | string | undefined;
      letterSpacing?: number | string | undefined;
      lightingColor?: number | string | undefined;
      limitingConeAngle?: number | string | undefined;
      local?: number | string | undefined;
      markerEnd?: string | undefined;
      markerHeight?: number | string | undefined;
      markerMid?: string | undefined;
      markerStart?: string | undefined;
      markerUnits?: number | string | undefined;
      markerWidth?: number | string | undefined;
      mask?: string | undefined;
      maskContentUnits?: number | string | undefined;
      maskUnits?: number | string | undefined;
      mathematical?: number | string | undefined;
      mode?: number | string | undefined;
      numOctaves?: number | string | undefined;
      offset?: number | string | undefined;
      opacity?: number | string | undefined;
      operator?: number | string | undefined;
      order?: number | string | undefined;
      orient?: number | string | undefined;
      orientation?: number | string | undefined;
      origin?: number | string | undefined;
      overflow?: number | string | undefined;
      overlinePosition?: number | string | undefined;
      overlineThickness?: number | string | undefined;
      paintOrder?: number | string | undefined;
      panose1?: number | string | undefined;
      path?: string | undefined;
      pathLength?: number | string | undefined;
      patternContentUnits?: string | undefined;
      patternTransform?: number | string | undefined;
      patternUnits?: string | undefined;
      pointerEvents?: number | string | undefined;
      points?: string | undefined;
      pointsAtX?: number | string | undefined;
      pointsAtY?: number | string | undefined;
      pointsAtZ?: number | string | undefined;
      preserveAlpha?: Booleanish | undefined;
      preserveAspectRatio?: string | undefined;
      primitiveUnits?: number | string | undefined;
      r?: number | string | undefined;
      radius?: number | string | undefined;
      refX?: number | string | undefined;
      refY?: number | string | undefined;
      renderingIntent?: number | string | undefined;
      repeatCount?: number | string | undefined;
      repeatDur?: number | string | undefined;
      requiredExtensions?: number | string | undefined;
      requiredFeatures?: number | string | undefined;
      restart?: number | string | undefined;
      result?: string | undefined;
      rotate?: number | string | undefined;
      rx?: number | string | undefined;
      ry?: number | string | undefined;
      scale?: number | string | undefined;
      seed?: number | string | undefined;
      shapeRendering?: number | string | undefined;
      slope?: number | string | undefined;
      spacing?: number | string | undefined;
      specularConstant?: number | string | undefined;
      specularExponent?: number | string | undefined;
      speed?: number | string | undefined;
      spreadMethod?: string | undefined;
      startOffset?: number | string | undefined;
      stdDeviation?: number | string | undefined;
      stemh?: number | string | undefined;
      stemv?: number | string | undefined;
      stitchTiles?: number | string | undefined;
      stopColor?: string | undefined;
      stopOpacity?: number | string | undefined;
      strikethroughPosition?: number | string | undefined;
      strikethroughThickness?: number | string | undefined;
      string?: number | string | undefined;
      stroke?: string | undefined;
      strokeDasharray?: string | number | undefined;
      strokeDashoffset?: string | number | undefined;
      strokeLinecap?: "butt" | "round" | "square" | "inherit" | undefined;
      strokeLinejoin?: "miter" | "round" | "bevel" | "inherit" | undefined;
      strokeMiterlimit?: number | string | undefined;
      strokeOpacity?: number | string | undefined;
      strokeWidth?: number | string | undefined;
      surfaceScale?: number | string | undefined;
      systemLanguage?: number | string | undefined;
      tableValues?: number | string | undefined;
      targetX?: number | string | undefined;
      targetY?: number | string | undefined;
      textAnchor?: string | undefined;
      textDecoration?: number | string | undefined;
      textLength?: number | string | undefined;
      textRendering?: number | string | undefined;
      to?: number | string | undefined;
      transform?: string | undefined;
      u1?: number | string | undefined;
      u2?: number | string | undefined;
      underlinePosition?: number | string | undefined;
      underlineThickness?: number | string | undefined;
      unicode?: number | string | undefined;
      unicodeBidi?: number | string | undefined;
      unicodeRange?: number | string | undefined;
      unitsPerEm?: number | string | undefined;
      vAlphabetic?: number | string | undefined;
      values?: string | undefined;
      vectorEffect?: number | string | undefined;
      version?: string | undefined;
      vertAdvY?: number | string | undefined;
      vertOriginX?: number | string | undefined;
      vertOriginY?: number | string | undefined;
      vHanging?: number | string | undefined;
      vIdeographic?: number | string | undefined;
      viewBox?: string | undefined;
      viewTarget?: number | string | undefined;
      visibility?: number | string | undefined;
      vMathematical?: number | string | undefined;
      widths?: number | string | undefined;
      wordSpacing?: number | string | undefined;
      writingMode?: number | string | undefined;
      x1?: number | string | undefined;
      x2?: number | string | undefined;
      x?: number | string | undefined;
      xChannelSelector?: string | undefined;
      xHeight?: number | string | undefined;
      xlinkActuate?: string | undefined;
      xlinkArcrole?: string | undefined;
      xlinkHref?: string | undefined;
      xlinkRole?: string | undefined;
      xlinkShow?: string | undefined;
      xlinkTitle?: string | undefined;
      xlinkType?: string | undefined;
      xmlBase?: string | undefined;
      xmlLang?: string | undefined;
      xmlns?: string | undefined;
      xmlnsXlink?: string | undefined;
      xmlSpace?: string | undefined;
      y1?: number | string | undefined;
      y2?: number | string | undefined;
      y?: number | string | undefined;
      yChannelSelector?: string | undefined;
      z?: number | string | undefined;
      zoomAndPan?: string | undefined;
    }
    interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS {}
    interface AllHTMLAttributes<T> extends HTMLAttributes<T> {
      // Standard HTML Attributes
      accept?: string | undefined;
      acceptCharset?: string | undefined;
      action?:
        | string
        | undefined
        | ((formData: FormData) => void | Promise<void>)
        | DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS];
      allowFullScreen?: boolean | undefined;
      allowTransparency?: boolean | undefined;
      alt?: string | undefined;
      as?: string | undefined;
      async?: boolean | undefined;
      autoComplete?: string | undefined;
      autoPlay?: boolean | undefined;
      capture?: boolean | "user" | "environment" | undefined;
      cellPadding?: number | string | undefined;
      cellSpacing?: number | string | undefined;
      charSet?: string | undefined;
      challenge?: string | undefined;
      checked?: boolean | undefined;
      cite?: string | undefined;
      classID?: string | undefined;
      cols?: number | undefined;
      colSpan?: number | undefined;
      controls?: boolean | undefined;
      coords?: string | undefined;
      crossOrigin?: CrossOrigin;
      data?: string | undefined;
      dateTime?: string | undefined;
      default?: boolean | undefined;
      defer?: boolean | undefined;
      disabled?: boolean | undefined;
      download?: any;
      encType?: string | undefined;
      form?: string | undefined;
      formAction?:
        | string
        | undefined
        | ((formData: FormData) => void | Promise<void>)
        | DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS];
      formEncType?: string | undefined;
      formMethod?: string | undefined;
      formNoValidate?: boolean | undefined;
      formTarget?: string | undefined;
      frameBorder?: number | string | undefined;
      headers?: string | undefined;
      height?: number | string | undefined;
      high?: number | undefined;
      href?: string | undefined;
      hrefLang?: string | undefined;
      htmlFor?: string | undefined;
      httpEquiv?: string | undefined;
      integrity?: string | undefined;
      keyParams?: string | undefined;
      keyType?: string | undefined;
      kind?: string | undefined;
      label?: string | undefined;
      list?: string | undefined;
      loop?: boolean | undefined;
      low?: number | undefined;
      manifest?: string | undefined;
      marginHeight?: number | undefined;
      marginWidth?: number | undefined;
      max?: number | string | undefined;
      maxLength?: number | undefined;
      media?: string | undefined;
      mediaGroup?: string | undefined;
      method?: string | undefined;
      min?: number | string | undefined;
      minLength?: number | undefined;
      multiple?: boolean | undefined;
      muted?: boolean | undefined;
      name?: string | undefined;
      noValidate?: boolean | undefined;
      open?: boolean | undefined;
      optimum?: number | undefined;
      pattern?: string | undefined;
      placeholder?: string | undefined;
      playsInline?: boolean | undefined;
      poster?: string | undefined;
      preload?: string | undefined;
      readOnly?: boolean | undefined;
      required?: boolean | undefined;
      reversed?: boolean | undefined;
      rows?: number | undefined;
      rowSpan?: number | undefined;
      sandbox?: string | undefined;
      scope?: string | undefined;
      scoped?: boolean | undefined;
      scrolling?: string | undefined;
      seamless?: boolean | undefined;
      selected?: boolean | undefined;
      shape?: string | undefined;
      size?: number | undefined;
      sizes?: string | undefined;
      span?: number | undefined;
      src?: string | undefined;
      srcDoc?: string | undefined;
      srcLang?: string | undefined;
      srcSet?: string | undefined;
      start?: number | undefined;
      step?: number | string | undefined;
      summary?: string | undefined;
      target?: string | undefined;
      type?: string | undefined;
      useMap?: string | undefined;
      value?: string | readonly string[] | number | undefined;
      width?: number | string | undefined;
      wmode?: string | undefined;
      wrap?: string | undefined;
    }
    type HTMLAttributeReferrerPolicy =
      | ""
      | "no-referrer"
      | "no-referrer-when-downgrade"
      | "origin"
      | "origin-when-cross-origin"
      | "same-origin"
      | "strict-origin"
      | "strict-origin-when-cross-origin"
      | "unsafe-url";

    type HTMLAttributeAnchorTarget =
      | "_self"
      | "_blank"
      | "_parent"
      | "_top"
      | (string & {});

    interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
      download?: any;
      href?: string | undefined;
      hrefLang?: string | undefined;
      media?: string | undefined;
      ping?: string | undefined;
      target?: HTMLAttributeAnchorTarget | undefined;
      type?: string | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
    }

    interface AudioHTMLAttributes<T> extends MediaHTMLAttributes<T> {}

    interface AreaHTMLAttributes<T> extends HTMLAttributes<T> {
      alt?: string | undefined;
      coords?: string | undefined;
      download?: any;
      href?: string | undefined;
      hrefLang?: string | undefined;
      media?: string | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
      shape?: string | undefined;
      target?: string | undefined;
    }

    interface BaseHTMLAttributes<T> extends HTMLAttributes<T> {
      href?: string | undefined;
      target?: string | undefined;
    }

    interface BlockquoteHTMLAttributes<T> extends HTMLAttributes<T> {
      cite?: string | undefined;
    }

    interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
      disabled?: boolean | undefined;
      form?: string | undefined;
      formAction?:
        | string
        | ((formData: FormData) => void | Promise<void>)
        | DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS]
        | undefined;
      formEncType?: string | undefined;
      formMethod?: string | undefined;
      formNoValidate?: boolean | undefined;
      formTarget?: string | undefined;
      name?: string | undefined;
      type?: "submit" | "reset" | "button" | undefined;
      value?: string | readonly string[] | number | undefined;
    }

    interface CanvasHTMLAttributes<T> extends HTMLAttributes<T> {
      height?: number | string | undefined;
      width?: number | string | undefined;
    }

    interface ColHTMLAttributes<T> extends HTMLAttributes<T> {
      span?: number | undefined;
      width?: number | string | undefined;
    }

    interface ColgroupHTMLAttributes<T> extends HTMLAttributes<T> {
      span?: number | undefined;
    }

    interface DataHTMLAttributes<T> extends HTMLAttributes<T> {
      value?: string | readonly string[] | number | undefined;
    }

    interface DetailsHTMLAttributes<T> extends HTMLAttributes<T> {
      open?: boolean | undefined;
      name?: string | undefined;
    }

    interface DelHTMLAttributes<T> extends HTMLAttributes<T> {
      cite?: string | undefined;
      dateTime?: string | undefined;
    }

    interface DialogHTMLAttributes<T> extends HTMLAttributes<T> {
      onCancel?: EventSystem.MsomEventHandler<T> | undefined;
      onClose?: EventSystem.MsomEventHandler<T> | undefined;
      open?: boolean | undefined;
    }

    interface EmbedHTMLAttributes<T> extends HTMLAttributes<T> {
      height?: number | string | undefined;
      src?: string | undefined;
      type?: string | undefined;
      width?: number | string | undefined;
    }

    interface FieldsetHTMLAttributes<T> extends HTMLAttributes<T> {
      disabled?: boolean | undefined;
      form?: string | undefined;
      name?: string | undefined;
    }

    interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
      acceptCharset?: string | undefined;
      action?:
        | string
        | undefined
        | ((formData: FormData) => void | Promise<void>)
        | DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS];
      autoComplete?: string | undefined;
      encType?: string | undefined;
      method?: string | undefined;
      name?: string | undefined;
      noValidate?: boolean | undefined;
      target?: string | undefined;
    }

    interface HtmlHTMLAttributes<T> extends HTMLAttributes<T> {
      manifest?: string | undefined;
    }

    interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
      allow?: string | undefined;
      allowFullScreen?: boolean | undefined;
      allowTransparency?: boolean | undefined;
      /** @deprecated */
      frameBorder?: number | string | undefined;
      height?: number | string | undefined;
      loading?: "eager" | "lazy" | undefined;
      /** @deprecated */
      marginHeight?: number | undefined;
      /** @deprecated */
      marginWidth?: number | undefined;
      name?: string | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
      sandbox?: string | undefined;
      /** @deprecated */
      scrolling?: string | undefined;
      seamless?: boolean | undefined;
      src?: string | undefined;
      srcDoc?: string | undefined;
      width?: number | string | undefined;
    }

    interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
      alt?: string | undefined;
      crossOrigin?: CrossOrigin;
      decoding?: "async" | "auto" | "sync" | undefined;
      fetchPriority?: "high" | "low" | "auto";
      height?: number | string | undefined;
      loading?: "eager" | "lazy" | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
      sizes?: string | undefined;
      src?: string | undefined;
      srcSet?: string | undefined;
      useMap?: string | undefined;
      width?: number | string | undefined;
    }

    interface InsHTMLAttributes<T> extends HTMLAttributes<T> {
      cite?: string | undefined;
      dateTime?: string | undefined;
    }

    type HTMLInputTypeAttribute =
      | "button"
      | "checkbox"
      | "color"
      | "date"
      | "datetime-local"
      | "email"
      | "file"
      | "hidden"
      | "image"
      | "month"
      | "number"
      | "password"
      | "radio"
      | "range"
      | "reset"
      | "search"
      | "submit"
      | "tel"
      | "text"
      | "time"
      | "url"
      | "week"
      | (string & {});

    type AutoFillAddressKind = "billing" | "shipping";
    type AutoFillBase = "" | "off" | "on";
    type AutoFillContactField =
      | "email"
      | "tel"
      | "tel-area-code"
      | "tel-country-code"
      | "tel-extension"
      | "tel-local"
      | "tel-local-prefix"
      | "tel-local-suffix"
      | "tel-national";
    type AutoFillContactKind = "home" | "mobile" | "work";
    type AutoFillCredentialField = "webauthn";
    type AutoFillNormalField =
      | "additional-name"
      | "address-level1"
      | "address-level2"
      | "address-level3"
      | "address-level4"
      | "address-line1"
      | "address-line2"
      | "address-line3"
      | "bday-day"
      | "bday-month"
      | "bday-year"
      | "cc-csc"
      | "cc-exp"
      | "cc-exp-month"
      | "cc-exp-year"
      | "cc-family-name"
      | "cc-given-name"
      | "cc-name"
      | "cc-number"
      | "cc-type"
      | "country"
      | "country-name"
      | "current-password"
      | "family-name"
      | "given-name"
      | "honorific-prefix"
      | "honorific-suffix"
      | "name"
      | "new-password"
      | "one-time-code"
      | "organization"
      | "postal-code"
      | "street-address"
      | "transaction-amount"
      | "transaction-currency"
      | "username";
    type OptionalPrefixToken<T extends string> = `${T} ` | "";
    type OptionalPostfixToken<T extends string> = ` ${T}` | "";
    type AutoFillField =
      | AutoFillNormalField
      | `${OptionalPrefixToken<AutoFillContactKind>}${AutoFillContactField}`;
    type AutoFillSection = `section-${string}`;
    type AutoFill =
      | AutoFillBase
      | `${OptionalPrefixToken<AutoFillSection>}${OptionalPrefixToken<AutoFillAddressKind>}${AutoFillField}${OptionalPostfixToken<AutoFillCredentialField>}`;
    type HTMLInputAutoCompleteAttribute = AutoFill | (string & {});

    interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
      accept?: string | undefined;
      alt?: string | undefined;
      autoComplete?: HTMLInputAutoCompleteAttribute | undefined;
      capture?: boolean | "user" | "environment" | undefined; // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
      checked?: boolean | undefined;
      disabled?: boolean | undefined;
      form?: string | undefined;
      formAction?:
        | string
        | ((formData: FormData) => void | Promise<void>)
        | DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS[keyof DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS]
        | undefined;
      formEncType?: string | undefined;
      formMethod?: string | undefined;
      formNoValidate?: boolean | undefined;
      formTarget?: string | undefined;
      height?: number | string | undefined;
      list?: string | undefined;
      max?: number | string | undefined;
      maxLength?: number | undefined;
      min?: number | string | undefined;
      minLength?: number | undefined;
      multiple?: boolean | undefined;
      name?: string | undefined;
      pattern?: string | undefined;
      placeholder?: string | undefined;
      readOnly?: boolean | undefined;
      required?: boolean | undefined;
      size?: number | undefined;
      src?: string | undefined;
      step?: number | string | undefined;
      type?: HTMLInputTypeAttribute | undefined;
      value?: string | readonly string[] | number | undefined;
      width?: number | string | undefined;

      onChange?: EventSystem.ChangeEventHandler<T> | undefined;
    }

    interface KeygenHTMLAttributes<T> extends HTMLAttributes<T> {
      challenge?: string | undefined;
      disabled?: boolean | undefined;
      form?: string | undefined;
      keyType?: string | undefined;
      keyParams?: string | undefined;
      name?: string | undefined;
    }

    interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
      form?: string | undefined;
      htmlFor?: string | undefined;
    }

    interface LiHTMLAttributes<T> extends HTMLAttributes<T> {
      value?: string | readonly string[] | number | undefined;
    }

    interface LinkHTMLAttributes<T> extends HTMLAttributes<T> {
      as?: string | undefined;
      crossOrigin?: CrossOrigin;
      fetchPriority?: "high" | "low" | "auto";
      href?: string | undefined;
      hrefLang?: string | undefined;
      integrity?: string | undefined;
      media?: string | undefined;
      imageSrcSet?: string | undefined;
      imageSizes?: string | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
      sizes?: string | undefined;
      type?: string | undefined;
      charSet?: string | undefined;

      // React props
      precedence?: string | undefined;
    }

    interface MapHTMLAttributes<T> extends HTMLAttributes<T> {
      name?: string | undefined;
    }

    interface MenuHTMLAttributes<T> extends HTMLAttributes<T> {
      type?: string | undefined;
    }

    interface MediaHTMLAttributes<T> extends HTMLAttributes<T> {
      autoPlay?: boolean | undefined;
      controls?: boolean | undefined;
      controlsList?: string | undefined;
      crossOrigin?: CrossOrigin;
      loop?: boolean | undefined;
      mediaGroup?: string | undefined;
      muted?: boolean | undefined;
      playsInline?: boolean | undefined;
      preload?: string | undefined;
      src?: string | undefined;
    }

    interface MetaHTMLAttributes<T> extends HTMLAttributes<T> {
      charSet?: string | undefined;
      content?: string | undefined;
      httpEquiv?: string | undefined;
      media?: string | undefined;
      name?: string | undefined;
    }

    interface MeterHTMLAttributes<T> extends HTMLAttributes<T> {
      form?: string | undefined;
      high?: number | undefined;
      low?: number | undefined;
      max?: number | string | undefined;
      min?: number | string | undefined;
      optimum?: number | undefined;
      value?: string | readonly string[] | number | undefined;
    }

    interface QuoteHTMLAttributes<T> extends HTMLAttributes<T> {
      cite?: string | undefined;
    }

    interface ObjectHTMLAttributes<T> extends HTMLAttributes<T> {
      classID?: string | undefined;
      data?: string | undefined;
      form?: string | undefined;
      height?: number | string | undefined;
      name?: string | undefined;
      type?: string | undefined;
      useMap?: string | undefined;
      width?: number | string | undefined;
      wmode?: string | undefined;
    }

    interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
      reversed?: boolean | undefined;
      start?: number | undefined;
      type?: "1" | "a" | "A" | "i" | "I" | undefined;
    }

    interface OptgroupHTMLAttributes<T> extends HTMLAttributes<T> {
      disabled?: boolean | undefined;
      label?: string | undefined;
    }

    interface OptionHTMLAttributes<T> extends HTMLAttributes<T> {
      disabled?: boolean | undefined;
      label?: string | undefined;
      selected?: boolean | undefined;
      value?: string | readonly string[] | number | undefined;
    }

    interface OutputHTMLAttributes<T> extends HTMLAttributes<T> {
      form?: string | undefined;
      htmlFor?: string | undefined;
      name?: string | undefined;
    }

    interface ParamHTMLAttributes<T> extends HTMLAttributes<T> {
      name?: string | undefined;
      value?: string | readonly string[] | number | undefined;
    }

    interface ProgressHTMLAttributes<T> extends HTMLAttributes<T> {
      max?: number | string | undefined;
      value?: string | readonly string[] | number | undefined;
    }

    interface SlotHTMLAttributes<T> extends HTMLAttributes<T> {
      name?: string | undefined;
    }

    interface ScriptHTMLAttributes<T> extends HTMLAttributes<T> {
      async?: boolean | undefined;
      /** @deprecated */
      charSet?: string | undefined;
      crossOrigin?: CrossOrigin;
      defer?: boolean | undefined;
      integrity?: string | undefined;
      noModule?: boolean | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
      src?: string | undefined;
      type?: string | undefined;
    }

    interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
      autoComplete?: string | undefined;
      disabled?: boolean | undefined;
      form?: string | undefined;
      multiple?: boolean | undefined;
      name?: string | undefined;
      required?: boolean | undefined;
      size?: number | undefined;
      value?: string | readonly string[] | number | undefined;
      onChange?: EventSystem.ChangeEventHandler<T> | undefined;
    }

    interface SourceHTMLAttributes<T> extends HTMLAttributes<T> {
      height?: number | string | undefined;
      media?: string | undefined;
      sizes?: string | undefined;
      src?: string | undefined;
      srcSet?: string | undefined;
      type?: string | undefined;
      width?: number | string | undefined;
    }

    interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
      media?: string | undefined;
      scoped?: boolean | undefined;
      type?: string | undefined;

      // React props
      href?: string | undefined;
      precedence?: string | undefined;
    }

    interface TableHTMLAttributes<T> extends HTMLAttributes<T> {
      align?: "left" | "center" | "right" | undefined;
      bgcolor?: string | undefined;
      border?: number | undefined;
      cellPadding?: number | string | undefined;
      cellSpacing?: number | string | undefined;
      frame?: boolean | undefined;
      rules?: "none" | "groups" | "rows" | "columns" | "all" | undefined;
      summary?: string | undefined;
      width?: number | string | undefined;
    }

    interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
      autoComplete?: string | undefined;
      cols?: number | undefined;
      dirName?: string | undefined;
      disabled?: boolean | undefined;
      form?: string | undefined;
      maxLength?: number | undefined;
      minLength?: number | undefined;
      name?: string | undefined;
      placeholder?: string | undefined;
      readOnly?: boolean | undefined;
      required?: boolean | undefined;
      rows?: number | undefined;
      value?: string | readonly string[] | number | undefined;
      wrap?: string | undefined;

      onChange?: EventSystem.ChangeEventHandler<T> | undefined;
    }

    interface TdHTMLAttributes<T> extends HTMLAttributes<T> {
      align?: "left" | "center" | "right" | "justify" | "char" | undefined;
      colSpan?: number | undefined;
      headers?: string | undefined;
      rowSpan?: number | undefined;
      scope?: string | undefined;
      abbr?: string | undefined;
      height?: number | string | undefined;
      width?: number | string | undefined;
      valign?: "top" | "middle" | "bottom" | "baseline" | undefined;
    }

    interface ThHTMLAttributes<T> extends HTMLAttributes<T> {
      align?: "left" | "center" | "right" | "justify" | "char" | undefined;
      colSpan?: number | undefined;
      headers?: string | undefined;
      rowSpan?: number | undefined;
      scope?: string | undefined;
      abbr?: string | undefined;
    }

    interface TimeHTMLAttributes<T> extends HTMLAttributes<T> {
      dateTime?: string | undefined;
    }

    interface TrackHTMLAttributes<T> extends HTMLAttributes<T> {
      default?: boolean | undefined;
      kind?: string | undefined;
      label?: string | undefined;
      src?: string | undefined;
      srcLang?: string | undefined;
    }

    interface VideoHTMLAttributes<T> extends MediaHTMLAttributes<T> {
      height?: number | string | undefined;
      playsInline?: boolean | undefined;
      poster?: string | undefined;
      width?: number | string | undefined;
      disablePictureInPicture?: boolean | undefined;
      disableRemotePlayback?: boolean | undefined;
    }

    // this list is "complete" in that it contains every SVG attribute
    // that React supports, but the types can be improved.
    // Full list here: https://facebook.github.io/react/docs/dom-elements.html
    //
    // The three broad type categories are (in order of restrictiveness):
    //   - "number | string"
    //   - "string"
    //   - union of string literals
    interface SVGAttributes<T> extends AriaAttributes, DOMEventAttibuties<T> {
      // React-specific Attributes
      suppressHydrationWarning?: boolean | undefined;

      // Attributes which also defined in HTMLAttributes
      // See comment in SVGDOMPropertyConfig.js
      className?: string | undefined;
      color?: string | undefined;
      height?: number | string | undefined;
      id?: string | undefined;
      lang?: string | undefined;
      max?: number | string | undefined;
      media?: string | undefined;
      method?: string | undefined;
      min?: number | string | undefined;
      name?: string | undefined;
      style?: CSSStyle | undefined;
      target?: string | undefined;
      type?: string | undefined;
      width?: number | string | undefined;

      // Other HTML properties supported by SVG elements in browsers
      role?: AriaRole | undefined;
      tabIndex?: number | undefined;
      crossOrigin?: CrossOrigin;

      // SVG Specific attributes
      accentHeight?: number | string | undefined;
      accumulate?: "none" | "sum" | undefined;
      additive?: "replace" | "sum" | undefined;
      alignmentBaseline?:
        | "auto"
        | "baseline"
        | "before-edge"
        | "text-before-edge"
        | "middle"
        | "central"
        | "after-edge"
        | "text-after-edge"
        | "ideographic"
        | "alphabetic"
        | "hanging"
        | "mathematical"
        | "inherit"
        | undefined;
      allowReorder?: "no" | "yes" | undefined;
      alphabetic?: number | string | undefined;
      amplitude?: number | string | undefined;
      arabicForm?: "initial" | "medial" | "terminal" | "isolated" | undefined;
      ascent?: number | string | undefined;
      attributeName?: string | undefined;
      attributeType?: string | undefined;
      autoReverse?: Booleanish | undefined;
      azimuth?: number | string | undefined;
      baseFrequency?: number | string | undefined;
      baselineShift?: number | string | undefined;
      baseProfile?: number | string | undefined;
      bbox?: number | string | undefined;
      begin?: number | string | undefined;
      bias?: number | string | undefined;
      by?: number | string | undefined;
      calcMode?: number | string | undefined;
      capHeight?: number | string | undefined;
      clip?: number | string | undefined;
      clipPath?: string | undefined;
      clipPathUnits?: number | string | undefined;
      clipRule?: number | string | undefined;
      colorInterpolation?: number | string | undefined;
      colorInterpolationFilters?:
        | "auto"
        | "sRGB"
        | "linearRGB"
        | "inherit"
        | undefined;
      colorProfile?: number | string | undefined;
      colorRendering?: number | string | undefined;
      contentScriptType?: number | string | undefined;
      contentStyleType?: number | string | undefined;
      cursor?: number | string | undefined;
      cx?: number | string | undefined;
      cy?: number | string | undefined;
      d?: string | undefined;
      decelerate?: number | string | undefined;
      descent?: number | string | undefined;
      diffuseConstant?: number | string | undefined;
      direction?: number | string | undefined;
      display?: number | string | undefined;
      divisor?: number | string | undefined;
      dominantBaseline?: number | string | undefined;
      dur?: number | string | undefined;
      dx?: number | string | undefined;
      dy?: number | string | undefined;
      edgeMode?: number | string | undefined;
      elevation?: number | string | undefined;
      enableBackground?: number | string | undefined;
      end?: number | string | undefined;
      exponent?: number | string | undefined;
      externalResourcesRequired?: Booleanish | undefined;
      fill?: string | undefined;
      fillOpacity?: number | string | undefined;
      fillRule?: "nonzero" | "evenodd" | "inherit" | undefined;
      filter?: string | undefined;
      filterRes?: number | string | undefined;
      filterUnits?: number | string | undefined;
      floodColor?: number | string | undefined;
      floodOpacity?: number | string | undefined;
      focusable?: Booleanish | "auto" | undefined;
      fontFamily?: string | undefined;
      fontSize?: number | string | undefined;
      fontSizeAdjust?: number | string | undefined;
      fontStretch?: number | string | undefined;
      fontStyle?: number | string | undefined;
      fontVariant?: number | string | undefined;
      fontWeight?: number | string | undefined;
      format?: number | string | undefined;
      fr?: number | string | undefined;
      from?: number | string | undefined;
      fx?: number | string | undefined;
      fy?: number | string | undefined;
      g1?: number | string | undefined;
      g2?: number | string | undefined;
      glyphName?: number | string | undefined;
      glyphOrientationHorizontal?: number | string | undefined;
      glyphOrientationVertical?: number | string | undefined;
      glyphRef?: number | string | undefined;
      gradientTransform?: string | undefined;
      gradientUnits?: string | undefined;
      hanging?: number | string | undefined;
      horizAdvX?: number | string | undefined;
      horizOriginX?: number | string | undefined;
      href?: string | undefined;
      ideographic?: number | string | undefined;
      imageRendering?: number | string | undefined;
      in2?: number | string | undefined;
      in?: string | undefined;
      intercept?: number | string | undefined;
      k1?: number | string | undefined;
      k2?: number | string | undefined;
      k3?: number | string | undefined;
      k4?: number | string | undefined;
      k?: number | string | undefined;
      kernelMatrix?: number | string | undefined;
      kernelUnitLength?: number | string | undefined;
      kerning?: number | string | undefined;
      keyPoints?: number | string | undefined;
      keySplines?: number | string | undefined;
      keyTimes?: number | string | undefined;
      lengthAdjust?: number | string | undefined;
      letterSpacing?: number | string | undefined;
      lightingColor?: number | string | undefined;
      limitingConeAngle?: number | string | undefined;
      local?: number | string | undefined;
      markerEnd?: string | undefined;
      markerHeight?: number | string | undefined;
      markerMid?: string | undefined;
      markerStart?: string | undefined;
      markerUnits?: number | string | undefined;
      markerWidth?: number | string | undefined;
      mask?: string | undefined;
      maskContentUnits?: number | string | undefined;
      maskUnits?: number | string | undefined;
      mathematical?: number | string | undefined;
      mode?: number | string | undefined;
      numOctaves?: number | string | undefined;
      offset?: number | string | undefined;
      opacity?: number | string | undefined;
      operator?: number | string | undefined;
      order?: number | string | undefined;
      orient?: number | string | undefined;
      orientation?: number | string | undefined;
      origin?: number | string | undefined;
      overflow?: number | string | undefined;
      overlinePosition?: number | string | undefined;
      overlineThickness?: number | string | undefined;
      paintOrder?: number | string | undefined;
      panose1?: number | string | undefined;
      path?: string | undefined;
      pathLength?: number | string | undefined;
      patternContentUnits?: string | undefined;
      patternTransform?: number | string | undefined;
      patternUnits?: string | undefined;
      pointerEvents?: number | string | undefined;
      points?: string | undefined;
      pointsAtX?: number | string | undefined;
      pointsAtY?: number | string | undefined;
      pointsAtZ?: number | string | undefined;
      preserveAlpha?: Booleanish | undefined;
      preserveAspectRatio?: string | undefined;
      primitiveUnits?: number | string | undefined;
      r?: number | string | undefined;
      radius?: number | string | undefined;
      refX?: number | string | undefined;
      refY?: number | string | undefined;
      renderingIntent?: number | string | undefined;
      repeatCount?: number | string | undefined;
      repeatDur?: number | string | undefined;
      requiredExtensions?: number | string | undefined;
      requiredFeatures?: number | string | undefined;
      restart?: number | string | undefined;
      result?: string | undefined;
      rotate?: number | string | undefined;
      rx?: number | string | undefined;
      ry?: number | string | undefined;
      scale?: number | string | undefined;
      seed?: number | string | undefined;
      shapeRendering?: number | string | undefined;
      slope?: number | string | undefined;
      spacing?: number | string | undefined;
      specularConstant?: number | string | undefined;
      specularExponent?: number | string | undefined;
      speed?: number | string | undefined;
      spreadMethod?: string | undefined;
      startOffset?: number | string | undefined;
      stdDeviation?: number | string | undefined;
      stemh?: number | string | undefined;
      stemv?: number | string | undefined;
      stitchTiles?: number | string | undefined;
      stopColor?: string | undefined;
      stopOpacity?: number | string | undefined;
      strikethroughPosition?: number | string | undefined;
      strikethroughThickness?: number | string | undefined;
      string?: number | string | undefined;
      stroke?: string | undefined;
      strokeDasharray?: string | number | undefined;
      strokeDashoffset?: string | number | undefined;
      strokeLinecap?: "butt" | "round" | "square" | "inherit" | undefined;
      strokeLinejoin?: "miter" | "round" | "bevel" | "inherit" | undefined;
      strokeMiterlimit?: number | string | undefined;
      strokeOpacity?: number | string | undefined;
      strokeWidth?: number | string | undefined;
      surfaceScale?: number | string | undefined;
      systemLanguage?: number | string | undefined;
      tableValues?: number | string | undefined;
      targetX?: number | string | undefined;
      targetY?: number | string | undefined;
      textAnchor?: string | undefined;
      textDecoration?: number | string | undefined;
      textLength?: number | string | undefined;
      textRendering?: number | string | undefined;
      to?: number | string | undefined;
      transform?: string | undefined;
      u1?: number | string | undefined;
      u2?: number | string | undefined;
      underlinePosition?: number | string | undefined;
      underlineThickness?: number | string | undefined;
      unicode?: number | string | undefined;
      unicodeBidi?: number | string | undefined;
      unicodeRange?: number | string | undefined;
      unitsPerEm?: number | string | undefined;
      vAlphabetic?: number | string | undefined;
      values?: string | undefined;
      vectorEffect?: number | string | undefined;
      version?: string | undefined;
      vertAdvY?: number | string | undefined;
      vertOriginX?: number | string | undefined;
      vertOriginY?: number | string | undefined;
      vHanging?: number | string | undefined;
      vIdeographic?: number | string | undefined;
      viewBox?: string | undefined;
      viewTarget?: number | string | undefined;
      visibility?: number | string | undefined;
      vMathematical?: number | string | undefined;
      widths?: number | string | undefined;
      wordSpacing?: number | string | undefined;
      writingMode?: number | string | undefined;
      x1?: number | string | undefined;
      x2?: number | string | undefined;
      x?: number | string | undefined;
      xChannelSelector?: string | undefined;
      xHeight?: number | string | undefined;
      xlinkActuate?: string | undefined;
      xlinkArcrole?: string | undefined;
      xlinkHref?: string | undefined;
      xlinkRole?: string | undefined;
      xlinkShow?: string | undefined;
      xlinkTitle?: string | undefined;
      xlinkType?: string | undefined;
      xmlBase?: string | undefined;
      xmlLang?: string | undefined;
      xmlns?: string | undefined;
      xmlnsXlink?: string | undefined;
      xmlSpace?: string | undefined;
      y1?: number | string | undefined;
      y2?: number | string | undefined;
      y?: number | string | undefined;
      yChannelSelector?: string | undefined;
      z?: number | string | undefined;
      zoomAndPan?: string | undefined;
    }

    interface WebViewHTMLAttributes<T> extends HTMLAttributes<T> {
      allowFullScreen?: boolean | undefined;
      allowpopups?: boolean | undefined;
      autosize?: boolean | undefined;
      blinkfeatures?: string | undefined;
      disableblinkfeatures?: string | undefined;
      disableguestresize?: boolean | undefined;
      disablewebsecurity?: boolean | undefined;
      guestinstance?: string | undefined;
      httpreferrer?: string | undefined;
      nodeintegration?: boolean | undefined;
      partition?: string | undefined;
      plugins?: boolean | undefined;
      preload?: string | undefined;
      src?: string | undefined;
      useragent?: string | undefined;
      webpreferences?: string | undefined;
    }

    // TODO: Move to react-dom
    type HTMLElementType =
      | "a"
      | "abbr"
      | "address"
      | "area"
      | "article"
      | "aside"
      | "audio"
      | "b"
      | "base"
      | "bdi"
      | "bdo"
      | "big"
      | "blockquote"
      | "body"
      | "br"
      | "button"
      | "canvas"
      | "caption"
      | "center"
      | "cite"
      | "code"
      | "col"
      | "colgroup"
      | "data"
      | "datalist"
      | "dd"
      | "del"
      | "details"
      | "dfn"
      | "dialog"
      | "div"
      | "dl"
      | "dt"
      | "em"
      | "embed"
      | "fieldset"
      | "figcaption"
      | "figure"
      | "footer"
      | "form"
      | "h1"
      | "h2"
      | "h3"
      | "h4"
      | "h5"
      | "h6"
      | "head"
      | "header"
      | "hgroup"
      | "hr"
      | "html"
      | "i"
      | "iframe"
      | "img"
      | "input"
      | "ins"
      | "kbd"
      | "keygen"
      | "label"
      | "legend"
      | "li"
      | "link"
      | "main"
      | "map"
      | "mark"
      | "menu"
      | "menuitem"
      | "meta"
      | "meter"
      | "nav"
      | "noscript"
      | "object"
      | "ol"
      | "optgroup"
      | "option"
      | "output"
      | "p"
      | "param"
      | "picture"
      | "pre"
      | "progress"
      | "q"
      | "rp"
      | "rt"
      | "ruby"
      | "s"
      | "samp"
      | "search"
      | "slot"
      | "script"
      | "section"
      | "select"
      | "small"
      | "source"
      | "span"
      | "strong"
      | "style"
      | "sub"
      | "summary"
      | "sup"
      | "table"
      | "template"
      | "tbody"
      | "td"
      | "textarea"
      | "tfoot"
      | "th"
      | "thead"
      | "time"
      | "title"
      | "tr"
      | "track"
      | "u"
      | "ul"
      | "var"
      | "video"
      | "wbr"
      | "webview";

    // TODO: Move to react-dom
    type SVGElementType =
      | "animate"
      | "circle"
      | "clipPath"
      | "defs"
      | "desc"
      | "ellipse"
      | "feBlend"
      | "feColorMatrix"
      | "feComponentTransfer"
      | "feComposite"
      | "feConvolveMatrix"
      | "feDiffuseLighting"
      | "feDisplacementMap"
      | "feDistantLight"
      | "feDropShadow"
      | "feFlood"
      | "feFuncA"
      | "feFuncB"
      | "feFuncG"
      | "feFuncR"
      | "feGaussianBlur"
      | "feImage"
      | "feMerge"
      | "feMergeNode"
      | "feMorphology"
      | "feOffset"
      | "fePointLight"
      | "feSpecularLighting"
      | "feSpotLight"
      | "feTile"
      | "feTurbulence"
      | "filter"
      | "foreignObject"
      | "g"
      | "image"
      | "line"
      | "linearGradient"
      | "marker"
      | "mask"
      | "metadata"
      | "path"
      | "pattern"
      | "polygon"
      | "polyline"
      | "radialGradient"
      | "rect"
      | "stop"
      | "svg"
      | "switch"
      | "symbol"
      | "text"
      | "textPath"
      | "tspan"
      | "use"
      | "view";

    interface HTMLProps<T>
      extends PropAttributesSystem.AllHTMLAttributes<T>,
        PropAttributesSystem.ClassAttributes<T> {}

    type DetailedHTMLProps<
      E extends HTMLAttributes<T>,
      T
    > = ClassAttributes<T> & WithLowercaseEvents<E>;

    interface SVGProps<T> extends SVGAttributes<T>, ClassAttributes<T> {}

    interface SVGLineElementAttributes<T> extends SVGProps<T> {}
    interface SVGTextElementAttributes<T> extends SVGProps<T> {}
  }

  type JSXElementConstructor<P> =
    | ((props: P) => MsomNode | Promise<MsomNode>)
    | (new (props: P) => IComponent<any, ComponentEvents>);

  namespace JSX {
    type ElementType = string | JSXElementConstructor<any>;
    interface Element extends MsomElement<any, any> {}
    interface ElementClass extends IComponent<any> {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes extends PropAttributesSystem.Attributes {}
    interface IntrinsicClassAttributes<T>
      extends PropAttributesSystem.ClassAttributes<T> {}
    // 类组件属性转换器
    export type ComponentPropsConverter<Props, Events extends {} = {}> = Omit<
      Props,
      "children"
    > & {
      [K in keyof Events]?: (
        data: Events[K],
        type: K,
        event: MEvent<Events>
      ) => void;
    };
    interface IntrinsicElements {
      // HTML
      a: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.AnchorHTMLAttributes<HTMLAnchorElement>,
        HTMLAnchorElement
      >;
      abbr: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      address: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      area: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.AreaHTMLAttributes<HTMLAreaElement>,
        HTMLAreaElement
      >;
      article: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      aside: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      audio: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.AudioHTMLAttributes<HTMLAudioElement>,
        HTMLAudioElement
      >;
      b: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      base: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.BaseHTMLAttributes<HTMLBaseElement>,
        HTMLBaseElement
      >;
      bdi: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      bdo: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      big: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      blockquote: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.BlockquoteHTMLAttributes<HTMLQuoteElement>,
        HTMLQuoteElement
      >;
      body: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLBodyElement>,
        HTMLBodyElement
      >;
      br: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLBRElement>,
        HTMLBRElement
      >;
      button: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.ButtonHTMLAttributes<HTMLButtonElement>,
        HTMLButtonElement
      >;
      canvas: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.CanvasHTMLAttributes<HTMLCanvasElement>,
        HTMLCanvasElement
      >;
      caption: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      center: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      cite: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      code: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      col: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.ColHTMLAttributes<HTMLTableColElement>,
        HTMLTableColElement
      >;
      colgroup: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.ColgroupHTMLAttributes<HTMLTableColElement>,
        HTMLTableColElement
      >;
      data: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.DataHTMLAttributes<HTMLDataElement>,
        HTMLDataElement
      >;
      datalist: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLDataListElement>,
        HTMLDataListElement
      >;
      dd: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      del: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.DelHTMLAttributes<HTMLModElement>,
        HTMLModElement
      >;
      details: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.DetailsHTMLAttributes<HTMLDetailsElement>,
        HTMLDetailsElement
      >;
      dfn: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      dialog: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.DialogHTMLAttributes<HTMLDialogElement>,
        HTMLDialogElement
      >;
      div: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLDivElement>,
        HTMLDivElement
      >;
      dl: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLDListElement>,
        HTMLDListElement
      >;
      dt: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      em: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      embed: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.EmbedHTMLAttributes<HTMLEmbedElement>,
        HTMLEmbedElement
      >;
      fieldset: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.FieldsetHTMLAttributes<HTMLFieldSetElement>,
        HTMLFieldSetElement
      >;
      figcaption: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      figure: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      footer: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      form: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.FormHTMLAttributes<HTMLFormElement>,
        HTMLFormElement
      >;
      h1: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      >;
      h2: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      >;
      h3: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      >;
      h4: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      >;
      h5: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      >;
      h6: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLHeadingElement>,
        HTMLHeadingElement
      >;
      head: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLHeadElement>,
        HTMLHeadElement
      >;
      header: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      hgroup: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      hr: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLHRElement>,
        HTMLHRElement
      >;
      html: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HtmlHTMLAttributes<HTMLHtmlElement>,
        HTMLHtmlElement
      >;
      i: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      iframe: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.IframeHTMLAttributes<HTMLIFrameElement>,
        HTMLIFrameElement
      >;
      img: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.ImgHTMLAttributes<HTMLImageElement>,
        HTMLImageElement
      >;
      input: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >;
      ins: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.InsHTMLAttributes<HTMLModElement>,
        HTMLModElement
      >;
      kbd: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      keygen: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.KeygenHTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      label: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.LabelHTMLAttributes<HTMLLabelElement>,
        HTMLLabelElement
      >;
      legend: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLLegendElement>,
        HTMLLegendElement
      >;
      li: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.LiHTMLAttributes<HTMLLIElement>,
        HTMLLIElement
      >;
      link: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.LinkHTMLAttributes<HTMLLinkElement>,
        HTMLLinkElement
      >;
      main: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      map: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.MapHTMLAttributes<HTMLMapElement>,
        HTMLMapElement
      >;
      mark: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      menu: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.MenuHTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      menuitem: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      meta: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.MetaHTMLAttributes<HTMLMetaElement>,
        HTMLMetaElement
      >;
      meter: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.MeterHTMLAttributes<HTMLMeterElement>,
        HTMLMeterElement
      >;
      nav: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      noindex: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      noscript: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      object: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.ObjectHTMLAttributes<HTMLObjectElement>,
        HTMLObjectElement
      >;
      ol: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.OlHTMLAttributes<HTMLOListElement>,
        HTMLOListElement
      >;
      optgroup: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.OptgroupHTMLAttributes<HTMLOptGroupElement>,
        HTMLOptGroupElement
      >;
      option: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.OptionHTMLAttributes<HTMLOptionElement>,
        HTMLOptionElement
      >;
      output: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.OutputHTMLAttributes<HTMLOutputElement>,
        HTMLOutputElement
      >;
      p: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLParagraphElement>,
        HTMLParagraphElement
      >;
      param: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.ParamHTMLAttributes<HTMLParamElement>,
        HTMLParamElement
      >;
      picture: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      pre: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLPreElement>,
        HTMLPreElement
      >;
      progress: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.ProgressHTMLAttributes<HTMLProgressElement>,
        HTMLProgressElement
      >;
      q: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.QuoteHTMLAttributes<HTMLQuoteElement>,
        HTMLQuoteElement
      >;
      rp: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      rt: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      ruby: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      s: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      samp: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      search: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      slot: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.SlotHTMLAttributes<HTMLSlotElement>,
        HTMLSlotElement
      >;
      script: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.ScriptHTMLAttributes<HTMLScriptElement>,
        HTMLScriptElement
      >;
      section: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      select: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.SelectHTMLAttributes<HTMLSelectElement>,
        HTMLSelectElement
      >;
      small: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      source: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.SourceHTMLAttributes<HTMLSourceElement>,
        HTMLSourceElement
      >;
      span: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLSpanElement>,
        HTMLSpanElement
      >;
      strong: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      style: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.StyleHTMLAttributes<HTMLStyleElement>,
        HTMLStyleElement
      >;
      sub: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      summary: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      sup: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      table: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.TableHTMLAttributes<HTMLTableElement>,
        HTMLTableElement
      >;
      template: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLTemplateElement>,
        HTMLTemplateElement
      >;
      tbody: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLTableSectionElement>,
        HTMLTableSectionElement
      >;
      td: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.TdHTMLAttributes<HTMLTableDataCellElement>,
        HTMLTableDataCellElement
      >;
      textarea: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.TextareaHTMLAttributes<HTMLTextAreaElement>,
        HTMLTextAreaElement
      >;
      tfoot: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLTableSectionElement>,
        HTMLTableSectionElement
      >;
      th: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.ThHTMLAttributes<HTMLTableHeaderCellElement>,
        HTMLTableHeaderCellElement
      >;
      thead: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLTableSectionElement>,
        HTMLTableSectionElement
      >;
      time: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.TimeHTMLAttributes<HTMLTimeElement>,
        HTMLTimeElement
      >;
      title: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLTitleElement>,
        HTMLTitleElement
      >;
      tr: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLTableRowElement>,
        HTMLTableRowElement
      >;
      track: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.TrackHTMLAttributes<HTMLTrackElement>,
        HTMLTrackElement
      >;
      u: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      ul: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLUListElement>,
        HTMLUListElement
      >;
      var: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      video: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.VideoHTMLAttributes<HTMLVideoElement>,
        HTMLVideoElement
      >;
      wbr: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      webview: PropAttributesSystem.DetailedHTMLProps<
        PropAttributesSystem.WebViewHTMLAttributes<HTMLWebViewElement>,
        HTMLWebViewElement
      >;

      // SVG
      svg: PropAttributesSystem.SVGProps<SVGSVGElement>;

      animate: PropAttributesSystem.SVGProps<SVGElement>; // TODO: It is SVGAnimateElement but is not in TypeScript's lib.dom.d.ts for now.
      animateMotion: PropAttributesSystem.SVGProps<SVGElement>;
      animateTransform: PropAttributesSystem.SVGProps<SVGElement>; // TODO: It is SVGAnimateTransformElement but is not in TypeScript's lib.dom.d.ts for now.
      circle: PropAttributesSystem.SVGProps<SVGCircleElement>;
      clipPath: PropAttributesSystem.SVGProps<SVGClipPathElement>;
      defs: PropAttributesSystem.SVGProps<SVGDefsElement>;
      desc: PropAttributesSystem.SVGProps<SVGDescElement>;
      ellipse: PropAttributesSystem.SVGProps<SVGEllipseElement>;
      feBlend: PropAttributesSystem.SVGProps<SVGFEBlendElement>;
      feColorMatrix: PropAttributesSystem.SVGProps<SVGFEColorMatrixElement>;
      feComponentTransfer: PropAttributesSystem.SVGProps<SVGFEComponentTransferElement>;
      feComposite: PropAttributesSystem.SVGProps<SVGFECompositeElement>;
      feConvolveMatrix: PropAttributesSystem.SVGProps<SVGFEConvolveMatrixElement>;
      feDiffuseLighting: PropAttributesSystem.SVGProps<SVGFEDiffuseLightingElement>;
      feDisplacementMap: PropAttributesSystem.SVGProps<SVGFEDisplacementMapElement>;
      feDistantLight: PropAttributesSystem.SVGProps<SVGFEDistantLightElement>;
      feDropShadow: PropAttributesSystem.SVGProps<SVGFEDropShadowElement>;
      feFlood: PropAttributesSystem.SVGProps<SVGFEFloodElement>;
      feFuncA: PropAttributesSystem.SVGProps<SVGFEFuncAElement>;
      feFuncB: PropAttributesSystem.SVGProps<SVGFEFuncBElement>;
      feFuncG: PropAttributesSystem.SVGProps<SVGFEFuncGElement>;
      feFuncR: PropAttributesSystem.SVGProps<SVGFEFuncRElement>;
      feGaussianBlur: PropAttributesSystem.SVGProps<SVGFEGaussianBlurElement>;
      feImage: PropAttributesSystem.SVGProps<SVGFEImageElement>;
      feMerge: PropAttributesSystem.SVGProps<SVGFEMergeElement>;
      feMergeNode: PropAttributesSystem.SVGProps<SVGFEMergeNodeElement>;
      feMorphology: PropAttributesSystem.SVGProps<SVGFEMorphologyElement>;
      feOffset: PropAttributesSystem.SVGProps<SVGFEOffsetElement>;
      fePointLight: PropAttributesSystem.SVGProps<SVGFEPointLightElement>;
      feSpecularLighting: PropAttributesSystem.SVGProps<SVGFESpecularLightingElement>;
      feSpotLight: PropAttributesSystem.SVGProps<SVGFESpotLightElement>;
      feTile: PropAttributesSystem.SVGProps<SVGFETileElement>;
      feTurbulence: PropAttributesSystem.SVGProps<SVGFETurbulenceElement>;
      filter: PropAttributesSystem.SVGProps<SVGFilterElement>;
      foreignObject: PropAttributesSystem.SVGProps<SVGForeignObjectElement>;
      g: PropAttributesSystem.SVGProps<SVGGElement>;
      image: PropAttributesSystem.SVGProps<SVGImageElement>;
      line: PropAttributesSystem.SVGLineElementAttributes<SVGLineElement>;
      linearGradient: PropAttributesSystem.SVGProps<SVGLinearGradientElement>;
      marker: PropAttributesSystem.SVGProps<SVGMarkerElement>;
      mask: PropAttributesSystem.SVGProps<SVGMaskElement>;
      metadata: PropAttributesSystem.SVGProps<SVGMetadataElement>;
      mpath: PropAttributesSystem.SVGProps<SVGElement>;
      path: PropAttributesSystem.SVGProps<SVGPathElement>;
      pattern: PropAttributesSystem.SVGProps<SVGPatternElement>;
      polygon: PropAttributesSystem.SVGProps<SVGPolygonElement>;
      polyline: PropAttributesSystem.SVGProps<SVGPolylineElement>;
      radialGradient: PropAttributesSystem.SVGProps<SVGRadialGradientElement>;
      rect: PropAttributesSystem.SVGProps<SVGRectElement>;
      set: PropAttributesSystem.SVGProps<SVGSetElement>;
      stop: PropAttributesSystem.SVGProps<SVGStopElement>;
      switch: PropAttributesSystem.SVGProps<SVGSwitchElement>;
      symbol: PropAttributesSystem.SVGProps<SVGSymbolElement>;
      text: PropAttributesSystem.SVGTextElementAttributes<SVGTextElement>;
      textPath: PropAttributesSystem.SVGProps<SVGTextPathElement>;
      tspan: PropAttributesSystem.SVGProps<SVGTSpanElement>;
      use: PropAttributesSystem.SVGProps<SVGUseElement>;
      view: PropAttributesSystem.SVGProps<SVGViewElement>;
    }
  }
  export type ComponentProps<C = never> = {
    $context?: Partial<Component.Context>;
    $key?: string | number | bigint | null | undefined;
    $ref?: IRef<unknown> | IRef<unknown>[];
    class?: ClassType;
    style?: CSSStyle;
    children?: C;
  };

  export type ComponentEvents = {
    created: null;
    mounted: null;
    unmounted: null;
  };
  interface IComponent<
    Props extends ComponentProps<unknown> = ComponentProps<unknown>,
    Events extends ComponentEvents = ComponentEvents
  > extends IEvent<Events> {
    props: JSX.ComponentPropsConverter<Props, Events>;
    $owner?: IComponent;
    el: HTMLElement | Text;
    isMounted(): boolean;
    set(props: Partial<Props>): void;
    setJSX(jsx: Props["children"]): void;
    render(): MsomNode | undefined | null | void;
    rendered(): void;
    created(): void;
    mount(): MsomNode | undefined | null | void;
    mounted(): void;
    onmounted(handle: () => void): void;
    unmount(): void;
    unmounted(): void;
    onunmounted(handle: () => void): void;
    destroy(): void;
  }

  export type VNodeArray = Iterable<VNode>;
  export type VNode = VNodeArray | MsomNode;

  type H<T extends unknown = any> = Omit<
    PropAttributesSystem.AllHTMLAttributes<T>,
    "children"
  > & {
    $context?: Partial<Component.Context>;
  } & PropAttributesSystem.ClassAttributes<T> & {
      nodeValue?: string;
    } & {
      children: MsomElement<any>[];
    };

  export type MsomElement<
    T extends string | JSXElementConstructor<any> =
      | string
      | JSXElementConstructor<any>,
    P extends H<T> = H<T>
  > = {
    type: T;
    props: P;
  };
  export namespace Component {
    export interface Context {}
  }
}
