# nn

[**Korean**](README-ko.md)

nn is a domain-specific language designed to define deep neural network models.

## Installation

```bash
git clone https://github.com/SieR-VR/nn
yarn install && yarn build
```

## Usage

```bash
yarn nn -f {input file} -o {output file}
```

## Features

### Size Type

```nn
Bypass[Size](x: Tensor[Size * 2]) =
  x
```

nn allows you to intuitively express the flow of size values through size arguments, and also perform operations.

### Tensor Type Checking

```nn
Linear[input, output](x: Tensor[input]) =
  |> MatMul(Trainable[input, output]('weight'))
  |> Bias(Trainable[input]('bias'))
                    ^^^^^
> Size mismatch: output != input
```

By determining all tensor shapes at compile time, you can prevent size errors before actually running the code.

### Concise Code

Here is the nn code for UNet:

```nn
ConvBlock[Channel](x: Tensor[H, W, C]) =
  |> Conv2D[3, 1, 1, Channel]()
  |> BatchNorm()
  |> ReLU()
  |> Conv2D[3, 1, 1, Channel]()
  |> BatchNorm()
  |> ReLU()

UNetEncoder[Channel](x: Tensor[H, W, C]) =
  |> ConvBlock[Channel]()
  |> MaxPool[2]()

UNetDecoder[Channel](x: Tensor[H, W, C], skip: Tensor[H, W, C]) =
  x
  |> Conv2DTransposed[3, 1, 1, Channel]()
  |> Concat(skip)
  |> ConvBlock[Channel]()

UNet[Channel](x: Tensor[H, W, C]) =
  |> s1 = UNetEncoder[Channel]()
  |> s2 = UNetEncoder[Channel * 2]()
  |> s3 = UNetEncoder[Channel * 4]()
  |> s4 = UNetEncoder[Channel * 8]()

  |> ConvBlock[Channel * 8]()

  |> UNetDecoder[Channel * 8](s4)
  |> UNetDecoder[Channel * 4](s3)
  |> UNetDecoder[Channel * 2](s2)
  |> UNetDecoder[Channel](s1)
```

It's 30 lines of code, compared to 125 lines of [code in Python](https://github.com/milesial/Pytorch-UNet). That's about 75% less code.

### Compile-Time Static Analysis

```
Linear[input, output](x: Tensor[input]) =
  |> MatMul(Trainable[input, output]('weight'))
  |> Bias(Trainable[output]('bias'))

Estimated Size
- input = 128, output = 32
- Trainable = 128 * 32 + 32 = 4,128 parameters (16.5KB in fp32)

Estimated Computing Size
- MatMul[input, output] x 1
- Bias[output] x 1
```

When the model is compiled, you can use the model's parameters to indicate how many parameters and how much computation the model will have.

### Separation of Concerns in Syntax

When defining nn models, the only keyword you need to remember is `Tensor`.

Everything else consists of special characters and user-defined names, allowing you to write code that can be understood even by those unfamiliar with the language.

## Contributing

!TODO

## License

[MIT License](LICENSE)
