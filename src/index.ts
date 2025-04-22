import { inspect } from "util";
import Parser from "tree-sitter";

import { SourceFile } from "@nn-lang/nn-language";
import { TypeChecker } from "@nn-lang/nn-type-checker";

import language from "@nn-lang/nn-tree-sitter";

const source = `
BatchNorm[input](x: Tensor[input]): Tensor[input]

ReLU[input](x: Tensor[input]): Tensor[input]

Conv2D[
  Kernel, 
  Padding, 
  Stride, 
  Channel
](
  x: Tensor[H, W, C]
): Tensor[
  (H + (2 * Padding) - Kernel) / Stride + 1, 
  (W + (2 * Padding) - Kernel) / Stride + 1,
  Channel 
]

MaxPool[Pool](x: Tensor[H, W, C]): Tensor[H / Pool, W / Pool, C]

Conv2DTransposed[
  Kernel,
  Padding,
  Stride,
  Pool,
  Channel
](
  x: Tensor[H, W, C]
): Tensor[
  ((H - 1) * Stride - 2 * Padding + Kernel) * Pool,
  ((W - 1) * Stride - 2 * Padding + Kernel) * Pool,
  Channel
]

Concat(x: Tensor[H, W, Cx], y: Tensor[H, W, Cy]): Tensor[H, W, Cx + Cy]

ConvBlock[Channel](x: Tensor[H, W, C]) =
  |> Conv2D[3, 1, 1, Channel]()
  |> BatchNorm()
  |> ReLU()
  |> Conv2D[3, 1, 1, Channel]()
  |> BatchNorm()
  |> ReLU()

UNetEncoder[Channel](x: Tensor[H, W, C]) =
  |> ConvBlock[Channel]()

UNetDecoder[Channel](x: Tensor[H, W, C], skip: Tensor[H * 2, W * 2, Channel]) =
  x
  |> Conv2DTransposed[3, 1, 1, 2, Channel]()
  |> Concat(skip)
  |> ConvBlock[Channel]()

UNet[Channel](x: Tensor[H, W, C]) =
  |> s1 = UNetEncoder[Channel]()
  |> p1 = MaxPool[2]()
  |> s2 = UNetEncoder[Channel * 2]()
  |> p2 = MaxPool[2]()
  |> s3 = UNetEncoder[Channel * 4]()
  |> p3 = MaxPool[2]()
  |> s4 = UNetEncoder[Channel * 8]()
  |> p4 = MaxPool[2]()
  
  |> ConvBlock[Channel * 8]()

  |> UNetDecoder[Channel * 8](s4)
  |> UNetDecoder[Channel * 4](s3)
  |> UNetDecoder[Channel * 2](s2)
  |> UNetDecoder[Channel](s1)

`;

(async () => {
  const parser = new Parser()
  parser.setLanguage(language as any)

  const result = SourceFile.parse(source, 'Linear.nn', parser as any)
  const context = TypeChecker.check(result)

  console.log(context.diagnostics)

  console.log(
    inspect(
      context.scope.flows['Conv2D']['return'],
      { depth: 3 }
    ),
    inspect(
      context.scope.flows['Conv2D']['returnType'],
      { depth: 3 }
    )
  )
})()
