declare module "@radix-ui/react-dropdown-menu" {
  import * as React from "react";

  type WithChildren = { children?: React.ReactNode };

  export const Root: React.ComponentType<WithChildren>;
  export const Portal: React.ComponentType<WithChildren>;
  export const Group: React.ComponentType<WithChildren>;
  export const Sub: React.ComponentType<WithChildren>;
  export const RadioGroup: React.ComponentType<WithChildren>;

  export const Trigger: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<"button"> & React.RefAttributes<HTMLElement>
  >;
  export const Content: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<"div"> &
      {
        sideOffset?: number;
        align?: "start" | "center" | "end";
        side?: "top" | "right" | "bottom" | "left";
      } &
      React.RefAttributes<HTMLElement>
  >;
  export const SubTrigger: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<"div"> & { inset?: boolean } & React.RefAttributes<HTMLElement>
  >;
  export const SubContent: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<"div"> & React.RefAttributes<HTMLElement>
  >;
  export const Item: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<"div"> & { inset?: boolean } & React.RefAttributes<HTMLElement>
  >;
  export const CheckboxItem: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<"div"> &
      {
        checked?: boolean;
        onCheckedChange?: (checked: boolean) => void;
      } &
      React.RefAttributes<HTMLElement>
  >;
  export const RadioItem: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<"div"> & React.RefAttributes<HTMLElement>
  >;
  export const Label: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<"div"> & React.RefAttributes<HTMLElement>
  >;
  export const Separator: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<"div"> & React.RefAttributes<HTMLElement>
  >;
}
